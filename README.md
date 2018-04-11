GitBook plugin for [Prism](http://prismjs.com/) with support for Prism plugins
==============

[![NPM](http://img.shields.io/npm/v/gitbook-plugin-prism-ext.svg?style=flat-square&label=npm)](https://www.npmjs.com/package/gitbook-plugin-prism-ext)

This plugin hilights the syntax of code blocks using the Prism highlighter.

Rendering is performed at build time, NOT at runtime on the browser. This allows the plugin to also run when generating PDF books.

Prism plugins are also supported but, as rendering is done at build time, plugins that generate interactive elements will not work properly; they will render (even for PDFs), but no interactivity is supported.

> **Technical note:** supporting Prism plugins on GitBook is not trivial, as they were designed for operation on the browser only, so a DOM representation of the document must be provided to them. This plugin provides such DOM trough an emulation that runs on NodeJS at build time, so that plugins operate as expected.

##### Before
<img src='http://i.imgur.com/cbk6O52.png'>

##### After
<img src='http://i.imgur.com/S1YMlee.png'>

## Usage

Add the plugin to your `book.json`, and disable default GitBook code highlighting:

```json
{
  "plugins": ["prism-ext", "-highlight"]
}
```

## Options


### `theme`
Override the default syntax highlighting styles.

The CSS file path may be relative to the `node_modules` folder or to the book's source folder (if you want to provide a custom style that is bundled with the book's files instead of being provided by an installable module).

##### Example:

```json
"pluginsConfig": {
  "prism": {
    "theme": "prismjs/themes/prism-solarizedlight.css"
  }
}
```

### `lang`
Support non-standard syntax prefixes by aliasing existing prefixes.

##### Example:

```json
"pluginsConfig": {
  "prism": {
    "lang": {
      "flow": "typescript"
    }
  }
}
```

### `ignore`
Due to other plugins using code block notion to denote other functionality, you can ignore certain langs

##### Example:

```json
"pluginsConfig": {
  "prism": {
    "ignore": [
      "mermaid",
      "eval-js"
    ]
  }
}
```

### `cssClasses`
Appends a space-separated list of CSS classes to each fenced code block (those whose PRE element has a CODE element as a direct child).

This is meant to be used with some plugins that require a specific CSS class to be applied to the PRE element, in order for the plugin to be activated on that block.

##### Example:

```json
"pluginsConfig": {
  "prism": {
    "cssClasses": "line-numbers"
  }
}
```

### `codeBlockExtSyntax`
If `true`, enables an extended Markdown syntax for fenced code blocks, which allows you to set CSS classes and HTML attributes on the respective HTML `<pre>` elements.

The default value is `false`.

##### Example:

```json
"pluginsConfig": {
  "prism": {
    "codeBlockExtSyntax": true
  }
}
```

Some Prism plugins require this feature to be enabled, because they are configured view CSS classes or HTML attributes.

#### Extended Mardown syntax for fenced code blocks

~~~html
```language{.class1.class2[...].classN attr1="value1" [...] attrN="valueN"}
  source code
```
~~~

The syntax definition above means that you may:

* optionally specify an arbitrary number of CSS classes;
* optionally specify an arbitrary number of HTML attributes.

The `[...]` represents a repetition of the previous element.

Note that attribute values **must** be double quoted.

`language` is the name of the programming language (ex: `javascript`) and it may be ommited.

##### Example of a fenced code block that uses the `line-highlight` and `line-numbers` plugins

~~~
```php{.line-numbers data-line="3,5-8"}
use Components\Component;

class HelloWorld extends Component
{
  protected function render ()
  {
    echo "Hello World!";
  }
}
```
~~~

### `plugins`
An array of strings containing a list of names of Prism plugins to load.

Each element of the array may be either:

1. a string with the name of one of the built-in Prism plugins;
   > ex: "line-numbers"
2. an array of CSS and/or JS files for loading a 3rd party  or custom plugin.
   > Each file path may be relative to `node_modules` or to the book's source folder.


##### Example:

See the section below titled "Prism Plugins".

## Prism Plugins

You may specify a list of Prism plugins on the `pluginsConfig.prism.plugins` configuration property on `book.json`.

> See the explanation of the `plugins` option above.

#### The simplest case

In this basic example, we're loading the `line-numbers` Prism plugin.

##### book.json

```json
{
  "plugins": ["-highlight", "prism-ext"],

  "pluginsConfig": {
    "prism": {
      "plugins": ["line-numbers"],
      "cssClasses": "line-numbers"
    }
  }
}
```

> Note: the `cssClasses` value is required by this specific Prism plugin.

#### A more complex case

In this example, we're loading:

1. the `line-numbers` and `show-invisibles` Prism plugins,
2. a custom syntax theme from the `prism-ASH` GitBook plugin,
3. a custom Prism plugin embedded on the book itself, on the `src` folder, comprised of a CSS and a JS file.

##### book.json

```json
{
  "plugins": ["-highlight", "prism-ext", "prism-ASH"],

    "pluginsConfig": {
    "prism": {
      "theme": "syntax-highlighting/assets/css/prism/prism-tomorrow-night-bright.css",
      "plugins": ["line-numbers", "show-invisibles", ["src/my-plugin.css", "src/my-plugin.js"]],
      "cssClasses": "line-numbers my-example-class"
    }
  }
}
```

### Supported Prism plugins

Prism plugin         | Compatible
---------------------|--------------
autolinker           | *not tested yet*
autoloader           | *not tested yet*
command-line         | *not tested yet*
copy-to-clipboard    | *not tested yet*
custom-class         | *not tested yet*
data-uri-highlight   | *not tested yet*
file-highlight       | *not tested yet*
highlight-keywords   | *not tested yet*
ie8                  | *not tested yet*
jsonp-highlight      | *not tested yet*
keep-markup          | *not tested yet*
line-highlight       | **Yes** (with limitations)
line-numbers         | **Yes**
normalize-whitespace | *not tested yet*
previewer-angle      | *not tested yet*
previewer-base       | *not tested yet*
previewer-color      | *not tested yet*
previewer-easing     | *not tested yet*
previewer-gradient   | *not tested yet*
previewer-time       | *not tested yet*
remove-initial-line-feed | **Yes**
show-invisibles      | **Yes**
show-language        | **Yes**
toolbar              | *not tested yet*
unescaped-markup     | *not tested yet*
wpd                  | *not tested yet*

> If you have feedback on this matter (either success or insuccess with specific plugins), please open an issue on GitHub.

### Unsupported Prism plugins

Unfortunately, some Prism plugins were just not designed for use in an environment that is not a web browser and make use of browser features that are not easily emulated.

An example of such a plugin is the `line-highlight` plugin. It requires a browser for computing the line height, in pixels, of each source code line.

We cannot emulate that on Node.js, when the book is being built (it would require a true CSS rendering engine), so the computed line height is always a fixed, pre-set value, and the highlights will not display correctly.

There are three workarounds for this problem:

1. Use an alternative plugin, installed via **npm**, that is compatible.
2. Copy the unsupported plugin to your book and modify it to make it compatbile.
3. Create your own plugin and either include it on your book or publish it on **npm** and install it.

> To load a custom plugin from files on your book, see the explanation of the `plugins` option above.

#### The line-highlight plugin

As a bonus, I've provided a workaround to make this plugin *sorta* work: the "secret" `lineHeight` configuration option.

Place this option on `book.json` with the line height, in pixels, of your fenced code blocks. The default value is `17.85`.

##### book.json example

```json
{
  "plugins": ["-highlight", "prism-ext"],

  "pluginsConfig": {
    "prism": {
      "plugins": ["line-highlight"],
      "lineHeight": 17.85
    }
  }
}
```

##### Markdown example

~~~
```php{data-line="3,5-8"}
use Components\Component;

class HelloWorld extends Component
{
  protected function render ()
  {
    echo "Hello World!";
  }
}
```
~~~

With a little tweaking, you may see something like this:

![line-highlight example](https://user-images.githubusercontent.com/1999803/38616157-ed68a598-3d8a-11e8-8a48-59e79b92cd59.png)

On this example, I'm using the `prism-base16-tomorrow.light` theme.  
The line numbers column from the `line-numbers` plugin is placed (via CSS) above the line numbers generated by the `line-highlight` plugin, so it hides them.  
As for the CSS being applied, the font-family is `Menlo`, font size is `11.9px` and line-height is `17.85px`. The `<pre>` has `position:relative` and `<code>` has `display:block`. The value for `lineHeight` on `book.json` is `17`.

Unfortunately, all of this only works if the user doesn't increase or decrease the text size when reading the book. This is a limitation of the `line-highlight` plugin that **cannot be overcome**, as it works in pixels only (not on `em` or other relative units).

A complete solution would require the original plugin to be forked and patched, or using another plugin, or applying the current plugin on the client-side (the browser) when the book is being viewed; but then, it would no longer work on PDFs.

> If anyone knows of an alternative Prism plugin, or makes one, please let me know and I'll mention it here.

## Prism Themes

[https://github.com/PrismJS/prism](https://github.com/PrismJS/)

#### Okaidia <small>`prismjs/themes/prism-okaidia.css`</small>
![Okaidia](http://i.imgur.com/uhe0yQY.png)

#### Solarized Light <small>`prismjs/themes/prism-solarizedlight.css`</small>
![Solarized Light](http://i.imgur.com/71sT5XB.png)

#### Tomorrow <small>`prismjs/themes/prism-tomorrow.css`</small>
![Tomorrow](http://i.imgur.com/Li3AHXU.png)

#### Dark <small>`prismjs/themes/prism-dark.css`</small>
![Dark](http://i.imgur.com/vA5P6fy.png)

#### Coy <small>`prismjs/themes/prism-coy.css`</small>
![Coy](http://i.imgur.com/kSJP9tq.png)

## Atelierbram Themes

[https://github.com/atelierbram/syntax-highlighting](https://github.com/atelierbram/syntax-highlighting)

#### Base16 Ocean Dark <small>`syntax-highlighting/assets/css/prism/prism-base16-ocean.dark.css`</small>
![Base16 Ocean Dark](http://i.imgur.com/REJCdrA.png)

#### Google Light <small>`syntax-highlighting/assets/css/prism/prism-base16-google.light.css`</small>
![Google Light](http://i.imgur.com/TyBYmSu.png)

#### Xonokai <small>`syntax-highlighting/assets/css/prism/prism-xonokai.css`</small>
![Google Light](http://i.imgur.com/fPjEEv8.png)

## Credits

Based on [gaearon/gitbook-plugin-prism](https://github.com/gaearon/gitbook-plugin-prism), which was based on [google_code_prettify](https://github.com/spricity/google_code_prettify).

## License

Apache 2
