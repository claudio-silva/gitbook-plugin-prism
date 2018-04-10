/* eslint-disable no-multi-str */
var Prism = require('prismjs');
var languages = require('prismjs').languages;
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
const jsdom = require('jsdom');
const JSDOM = jsdom.jsdom;

const DEFAULT_LANGUAGE = 'markup';
const MAP_LANGUAGES = {
  'py': 'python',
  'js': 'javascript',
  'rb': 'ruby',
  'cs': 'csharp',
  'sh': 'bash',
  'html': 'markup'
};
const PLUGIN_ASSETS = {
  'autolinker':               ['prism-autolinker.css', 'prism-autolinker.min.js'],
  'autoloader':               ['prism-autoloader.min.js'],
  'command-line':             ['prism-command-line.css', 'prism-command-line.min.js'],
  'copy-to-clipboard':        ['prism-copy-to-clipboard.min.js'],
  'custom-class':             ['prism-custom-class.min.js'],
  'data-uri-highlight':       ['prism-data-uri-highlight.min.js'],
  'file-highlight':           ['prism-file-highlight.min.js'],
  'highlight-keywords':       ['prism-highlight-keywords.min.js'],
  'ie8':                      ['prism-ie8.css', 'prism-ie8.min.js'],
  'jsonp-highlight':          ['prism-jsonp-highlight.min.js'],
  'keep-markup':              ['prism-keep-markup.min.js'],
  'line-highlight':           ['prism-line-highlight.css', 'prism-line-highlight.min.js'],
  'line-numbers':             ['prism-line-numbers.css', 'prism-line-numbers.min.js'],
  'normalize-whitespace':     ['prism-normalize-whitespace.min.js'],
  'previewer-angle':          ['prism-previewer-angle.css', 'prism-previewer-angle.min.js'],
  'previewer-base':           ['prism-previewer-base.css', 'prism-previewer-base.min.js'],
  'previewer-color':          ['prism-previewer-color.css', 'prism-previewer-color.min.js'],
  'previewer-easing':         ['prism-previewer-easing.css', 'prism-previewer-easing.min.js'],
  'previewer-gradient':       ['prism-previewer-gradient.css', 'prism-previewer-gradient.min.js'],
  'previewer-time':           ['prism-previewer-time.css', 'prism-previewer-time.min.js'],
  'remove-initial-line-feed': ['prism-remove-initial-line-feed.min.js'],
  'show-invisibles':          ['prism-show-invisibles.css', 'prism-show-invisibles.min.js'],
  'show-language':            ['prism-show-language.min.js'],
  'toolbar':                  ['prism-toolbar.css', 'prism-toolbar.min.js'],
  'unescaped-markup':         ['prism-unescaped-markup.css', 'prism-unescaped-markup.min.js'],
  'wpd':                      ['prism-wpd.css', 'prism-wpd.min.js']
};
var blocks;
var assets;
var accTime;
var pageCount;

// Base languages syntaxes (as of prism@1.6.0), extended by other syntaxes.
// They need to be required before the others.
var PRELUDE = [
  'clike', 'javascript', 'markup', 'c', 'ruby', 'css',
  // The following depends on previous ones
  'java', 'php'
];
PRELUDE.map(requireSyntax);

function error() {
  var args = ['error:'].concat(Array.prototype.slice.call(arguments));
  console.error.apply(this, args);
  process.exit(1);
}

function warn() {
  var args = ['warn:'].concat(Array.prototype.slice.call(arguments));
  console.warn.apply(this, args);
}

function info() {
  var args = ['info:'].concat(Array.prototype.slice.call(arguments));
  console.info.apply(this, args);
}

/**
 * Load the syntax definition for a language id
 */
function requireSyntax(lang) {
  require('prismjs/components/prism-' + lang + '.js');
}

function getConfig(context, property, defaultValue) {
  var config = context.config ? /* 3.x */ context.config : /* 2.x */ context.book.config;
  return config.get(property, defaultValue);
}

function isEbook(book) {
  // 3.x
  if (book.output && book.output.name) {
    return book.output.name === 'ebook';
  }

  // 2.x
  if (book.options && book.options.generator) {
    return book.options.generator === 'ebook';
  }

  return false;
}

function getAssets() {
  var book = this;
  var cssFiles;
  var theme = getConfig(book, 'pluginsConfig.prism.theme');
  if (theme) cssFiles = [theme];
  else cssFiles = ['prismjs/themes/prism.css'];

  cssFiles.reverse().forEach(function (cssFile) {
    publishAssetFile(cssFile, book, true);
  });

  return {
    assets: getAssetsPath(this),
    css: assets
  };
}

module.exports = {
  book: getAssets,

  ebook: function () {

    // Adding prism-ebook.css to the CSS collection forces Gitbook
    // reference to it in the html markup that is converted into a PDF.
    var assets = getAssets.call(this);
    assets.css.push('prism-ebook.css');
    return assets;
  },

  hooks: {

    // Manually copy prism-ebook.css into the temporary directory that Gitbook uses for inlining
    // styles from this plugin. The getAssets() (above) function can't be leveraged because
    // ebook-prism.css lives outside the folder referenced by this plugin's config.
    //
    // @Inspiration https://github.com/GitbookIO/plugin-styles-less/blob/master/index.js#L8
    init: function () {
      accTime = pageCount = 0;
      var book = this;
      assets = [];

      // Setup emulated browser environment
      global.Prism = Prism;
      global.self = global;
      global.document = JSDOM();
      global.window = global;
      global.getComputedStyle = function (elt, pseudoElt) {
        return {
          lineHeight: getConfig(book, 'pluginsConfig.prism.lineHeight', 17.85)
        };
      };
      global.location = {
        hash: '#'
      };

      // Load Prism plugins
      var plugins = getConfig(book, 'pluginsConfig.prism.plugins', []);
      plugins.forEach(function (plugin) {
        // Custom plugin
        var files;
        if (typeof plugin === 'string') {
          files = PLUGIN_ASSETS[plugin];
          if (files) {
            files = files.map(function (file) {
              return 'prismjs/plugins/' + plugin + '/' + file;
            });
          }
          if (files === undefined) {
            warn('plugin "' + plugin + '" not found');
            return;
          }
        } else if (typeof plugin === 'object' && plugin.length) { // check if it's an array
          files = plugin;
          plugin = path.basename(files[0]);
        } else {
          warn('invalid "pluginsConfig.prism.plugins" setting');
          return;
        }

        for (var i = 0; i < files.length; ++i) {
          /** @type {string} */
          var file = files[i];
          if (file.match(/.js$/i)) {
            info('loading Prism plugin', '"' + path.basename(file) + '"...');
            loadPlugin(file, book);
          } else if (file.match(/.css$/i)) {
            publishAssetFile(file, book);
          } else {
            warn('invalid file type (' + file + ') on "pluginsConfig.prism.plugins" setting');
            return;
          }
        }

      });

      if (!isEbook(book)) return;

      // Publish assets for PDF rendering.

      publishAssetFile(path.resolve(__dirname, './prism-ebook.css'), book);
    },

    'page:before': function (page) {
      if (getConfig(this, 'pluginsConfig.prism.codeBlockExtSyntax')) {
        // Move code block attributes to a marker inside the respective code block.
        page.content = page.content.replace(/```(.*)?\{(.+?)\}(\s*)/g, '```$1$3#MDATTR#{$2}');
      }
      return page;
    },

    page: function (page) {
      var startTime = process.hrtime();
      blocks = {};
      var doc = JSDOM(page.content);
      var book = this;
      var $ = doc.querySelectorAll.bind(doc);
      var changed = false;

      // Prism css styles target the <code> and <pre> blocks using
      // a substring CSS selector:
      //
      //    code[class*="language-"], pre[class*="language-"]
      //
      // Adding "language-" to <pre> element should be sufficient to trigger
      // correct color theme.

      var cssClasses = getConfig(this, 'pluginsConfig.prism.cssClasses');
      $('pre').forEach(function (preElement, i) {
        var code = preElement.querySelector('code');
        if (!code) return;
        // From here on, only PRE > CODE blocks are processed.
        changed = true;

        // Check for attribute markers and process them.
        var m = code.innerHTML.match(/#MDATTR#\{(.+?)\}([\s\S]*)/);
        if (m) {
          // Remove marker.
          code.innerHTML = m[2];

          // Apply CSS class (if set).
          var m2;
          if ((m2 = m[1].match(/^\.(\S+)/)) !== null) preElement.className = m2[1].replace(/\./g, ' ');

          // Apply attributes (if any).
          var attrExp = /(\S+?)="(.*?)"/g;
          while ((m2 = attrExp.exec(m[1])) !== null) {
            preElement.setAttribute(m2[1], m2[2]);
          }
        };

        if (cssClasses) preElement.className = preElement.className ? preElement.className + ' ' + cssClasses : cssClasses;

        var _class = code.getAttribute('class');
        if (_class) {
          var match = _class.match(/lang-(\w+)/);
          if (match && match[1]) preElement.setAttribute('lang', match[1]);
        }
        //
        highlight(code, book, 'CH' + i);
      });

      if (changed) {
        page.content = toHTML(doc);
      }

      accTime += process.hrtime(startTime)[1];
      ++pageCount;

      return page;
    },

    'finish:before': function () {
      info('highlighting', pageCount ,'pages took', (accTime / 1000000000.0).toFixed(1), 'seconds');
    }
  },

  blocks: {
    /**
     * Processes `code` blocks. These match `<pre><code>` sections of the document.
     * If the block has an ID embedded on the start of its content, use that ID to fectch a previously highlighted HTML
     * block from the `blocks` dictionary.
     * @param {{body:string,kwargs:Object,args:Array,blocks:Array}} block
     * @returns {{body:string,kwargs:Object,args:Array,blocks:Array}}
     */
    code: function (block) {
      var m = block.body.match(/^#(CH\d+)#$/);
      if (m) block.body = blocks[m[1]];
      else block.body = escapeString(block.body);
      return block;
    }
  }

};

/**
 * Highlights a section of source code.
 *
 * Note: the DOM changes that are performed here will be later on discarded by GitBook, so we need to save them on
 * the `blocks` dictionary and re-apply them later when the template engine is processing `code` blocks.
 * @param {HTMLElement} codeElement
 * @param {Object} book
 * @param {string} id A code block ID used for saving this block and retrieving it later.
 * @returns {boolean} True if the block was highlighted.
 */
function highlight (codeElement, book, id) {

  var userDefined = getConfig(book, 'pluginsConfig.prism.lang', {});
  var userIgnored = getConfig(book, 'pluginsConfig.prism.ignore', []);
  var preElement = codeElement.parentElement;

  // Normalize language id
  var lang = preElement.getAttribute('lang') || DEFAULT_LANGUAGE;
  lang = userDefined[lang] || MAP_LANGUAGES[lang] || lang;

  // Check to see if the lang is ignored
  if (userIgnored.indexOf(lang) > -1) {
    return false;
  }

  // Try and find the language definition in components folder
  if (!languages[lang]) {
    try {
      requireSyntax(lang);
    } catch (e) {
      warn('Failed to load Prism syntax: ' + lang);
      warn(e);
    }
  }

  if (!languages[lang]) lang = DEFAULT_LANGUAGE;

  // Check against html, prism "markup" works for this
  if (lang === 'html') {
    lang = 'markup';
  }

  try {
    Prism.highlightElement(codeElement);
  } catch (e) {
    warn('Failed to highlight:');
    warn(e);
    return false;
  }

  // Save the highlighted block for later use.
  blocks[id] = codeElement.innerHTML;
  // Replace the block by an ID reference.
  codeElement.textContent = '#' + id + '#';
  return true;
}

function toHTML (fragment) {
  var out = [];
  var ch = fragment.children;
  for (var i = 0, m = ch.length; i < m; ++i) {
    out.push(ch.item(i).outerHTML);
  }
  return out.join('');
}

// Escaping regexes
const AMP_REGEX = /&/g,
  NBSP_REGEX = /\u00a0/g,
  DOUBLE_QUOTE_REGEX = /"/g,
  LT_REGEX = /</g,
  GT_REGEX = />/g;

// Escape string
function escapeString(str, attrMode) {
  str = str
    .replace(AMP_REGEX, '&amp;')
    .replace(NBSP_REGEX, '&nbsp;');

  if (attrMode) str = str.replace(DOUBLE_QUOTE_REGEX, '&quot;');

  else {
    str = str
      .replace(LT_REGEX, '&lt;')
      .replace(GT_REGEX, '&gt;');
  }

  return str;
}

function getAssetsPath (book) {
  return path.join(book.output.root(), '/gitbook/gitbook-plugin-prism');
}

/**
 * Copies a file to the plugin's assets folder.
 * @param {string} srcPath
 * @param {Object} book
 * @param {boolean} [prepend]=false True to register the file before the files that are already published.
 * @returns {boolean} True if the file was successfully copied.
 */
function publishAssetFile (srcPath, book, prepend) {
  var outputDirectory = getAssetsPath(book);
  mkdirp.sync(outputDirectory);

  var fileName = path.basename(srcPath);
  var outputFile = path.resolve(outputDirectory, fileName);

  try {
    srcPath = require.resolve(srcPath);
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      var altPath = book.resolve(srcPath);
      if (fs.existsSync(altPath)) return publishAssetFile(altPath, book, prepend);
    }
    warn('Can\'t find file "' + srcPath + '"');
    return false;
  }

  try {
    fs.writeFileSync(outputFile, fs.readFileSync(srcPath));
  } catch (e) {
    warn('Failed to publish ' + fileName);
    warn(e);
    return false;
  }
  if (prepend) assets.unshift(path.basename(outputFile));
  else assets.push(path.basename(outputFile));
  return true;
}

/**
 * Loads a Prism plugin's javascript file.
 * @param {string} srcPath Path to the .js file.
 * @param {Object} book
 * @returns {boolean} True if the file was successfully loaded.
 */
function loadPlugin (srcPath, book) {
  try {
    require(srcPath);
  } catch (e) {
    var msg = '';
    if (e.code === 'MODULE_NOT_FOUND') {
      var altPath = book.resolve(srcPath);
      if (fs.existsSync(altPath)) return loadPlugin(altPath, book);
      msg = 'file not found';
    }
    else msg = e.message;
    warn('Can\'t load Prism plugin "' + srcPath + '"; ' + msg);
    return false;
  }
  return true;
}
