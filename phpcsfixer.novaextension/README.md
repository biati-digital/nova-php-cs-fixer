# PHP formatter for Nova with HTML, Blade and Twig support

This is an extension for Nova to format PHP files on save or by command, it uses phpcs fixer to format PHP code, it can also format HTML inside PHP files, Blade and Twig files.

## Features

-   Works out of the box no need to install anything
-   HTML support, it can handle files with inline HTML
-   Blade support, it can format .blade.php files
-   Twig support, it can format .twig files
-   Many options to customize the formatter the way you want
-   Format on save, using a command or right click
-   Workspace and Global configuration available
-   Support for .editorconfig

## Before Start

If you are using Prettier by Alexander Weiss make sure to go to Prettier Preferences and in the section **Ignored Syntaxes** select PHP.


## Need help configuring the extension?
This extension uses phpcs fixer under the hood, if you try to format your code and don't see any change then there's a big chance you are not setting your rules correctly, here you can see the recommended way for defining your fixer rules [phpcsfixer-rules.md](https://github.com/biati-digital/nova-php-cs-fixer/blob/main/phpcsfixer-rules.md)

## Extension Options

This extension provides multiple options to help you customize the formatting of your code

#### PHP CS Fixer Options

- **PHP Path** - Path to your PHP installation, if empty the default php included with the OS will be used

- **CS Fixer Path** Path to php-cs-fixer, if empty the fixer included with the extension will be used

- **PHP Dedicated server and Dedicated server port** PHP is really fast but the start can be a little slow, having a small server runnig will improve the formatting speed, but please try both methods and decide the one you want to use, both are fine.

- **Coding Standard** Select the coding standard you prefer, available options are **"PSR1", "PSR2", "PSR12", "Symfony", "PhpCsFixer", "WordPress", "None"** If you set it to `None` you can add any other standard you want in the Additional Fixer Rules. `WordPress` Fixes are not included with phpcs fixer so if you select `WordPress` as standard the `Additional Fixer Rules` option will be ignored and the formatter will use a defined set of rules for WordPress.

- **Additional Fixer Rules** You can configure rules to format PHP the way you want, this rules will be global but can be overwritten by using a config file or configuring the extension in your workspace, you can view all available options here [PHP-CS-Fixer](https://github.com/FriendsOfPHP/PHP-CS-Fixer):

You can define your rules like this (one per line)

```
array_syntax: { "syntax": "short" }
array_indentation: true
```


- **Global config path** Instead of defining the rules above you can select a global configuration file ".php_cs or .php_cs.dist", the fixer will use your configuration file instead of the global rules. You can also overwritte the global config file by adding a ".php_cs or .php_cs.dist" file in the root of your project that way each project can have it's own rules or if you don't want the file inside your project you can define it in the extension options of the active workspace. [Need help with your configuration file?](https://github.com/biati-digital/nova-php-cs-fixer/blob/main/phpcsfixer-rules.md)


- **Format on Save** Enable or disable automatic formatting on save

- **Format on save only if workspace has a config file** Only format on save if the workspace contains a configuration file for example: .php_cs or .php_cs.dist or .php-cs-fixer.php or .php-cs-fixer.dist.php. You can still format the file doing right click in the code and choose Format with PHP CS Fixer

- **Ignore remote files** Enable or disable automatic formatting of remote files

- **Respect Nova preferences for PHP indentation** If enabled, the formatter will use Nova's tab width and indentetation style for the language PHP which also adds supoprt for .editorconfig

- **Use tabs** Enable to indent lines with tabs instead of spaces

- **Tab width** Specify the number of spaces per indentation-level.


#### HTML Options

- **Format HTML in PHP files** Enable or disable formatting of HTML inside the PHP files.

- **Apply Additional fixes** Addition HTML fixes, more info here [aditional-fixes.md](https://github.com/biati-digital/nova-php-cs-fixer/blob/main/aditional-fixes.md)

- **HTML Rules** Add the rules you want to use to format your HTML, here's an example of the available options:
**Note: Please read and make sure you understand the options otherwise do not move anything here, check all the available options here [html-options.md](https://github.com/biati-digital/nova-php-cs-fixer/blob/main/html-options.md)**

```
max_preserve_newlines: 10
preserve_newlines: true
indent_scripts: "keep"
```


#### Blade Options

- **Format Blade files on save** Enable or disable format on save for blade files **.blade.php**

- **Respect Nova preferences for Blade indentation** If enabled, the formatter will use Nova's tab width and indentetation style for Blade files which also adds supoprt for .editorconfig

- **Use Tabs** Set to true to use tabs or leave unchecked to use spaces

- **Tab Width** Specify the number of spaces per indentation level

- **Blade Rules** Add the rules you want to use to format your Blade, it can use the same options as the HTML Rules option

```
max_preserve_newlines: 10
preserve_newlines: true
indent_scripts: "keep"
```


#### Twig Options

- **Format Twig files on save** Enable or disable format on save for twig files **.twig**

- **Respect Nova preferences for Twig indentation** If enabled, the formatter will use Nova's tab width and indentetation style for Blade files which also adds supoprt for .editorconfig

- **Use Tabs** Set to true to use tabs or leave unchecked to use spaces

- **Tab Width** Specify the number of spaces per indentation level

- **Twig Rules** Add the rules you want to use to format your Twig file, for more information about the options see **[twig-options.md](https://github.com/biati-digital/nova-php-cs-fixer/blob/main/twig-options.md)**

```
preserve: 3
new_line: true
```


## Help us improve the extension

There's a link to submit bug reports, if you find an error please let us know, it takes you a few minutes.
