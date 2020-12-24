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

## Before Start

If you are using Prettier by Alexander Weiss make sure to go to Prettier Preferences and in the section **Ignored Syntaxes** select PHP.

## Extension Options

This extension provides multiple options to help you customize the formatting of your code

#### PHP CS Fixer Options

- **PHP Path** - Path to your PHP installation, if empty the default php included with the OS will be used

- **CS Fixer Path** Path to php-cs-fixer, if empty the fixer included with the extension will be used

- **Format on Save** Enable or disable automatic formatting on save

- **PHP Dedicated server and Dedicated server port** PHP is really fast but the start can be a little slow, having a small server runnig will improve the formatting speed, but please try both methods and decide the one you want to use, both are fine.

- **Fixer Rules** Here you can configure the rules to format PHP the way you want, this rules will be global but can be overwritten by using a config file or configuring the extension in your workspace, you can view all available options here [PHP-CS-Fixer](https://github.com/FriendsOfPHP/PHP-CS-Fixer): 

Example of how to add your rules:You can simply add an standard

```
@PSR2
```

Or you can configure some more rules in the same line

```
@PSR2,full_opening_tag,-blank_line_before_statement
```

You can add an even more advanced configuration like this (one per line)

```
@PSR2: true
array_syntax: { "syntax": "short" }
array_indentation: true
```

- **Global config path** Instead of defining the rules above you can select a global configuration file ".php_cs or .php_cs.dist", the fixer will use your configuration file instead of the global rules. You can also overwritte the global config file by adding a ".php_cs or .php_cs.dist" file in the root of your project that way each project can have it's own rules or if you don't want the file inside your project you can define it in the extension options of the active workspace


#### HTML Options

- **Format HTML in PHP files** Enable or disable formatting of HTML inside the PHP files.

- **Apply Additional fixes** Addition HTML fixes, more info here [aditional-fixes.md](aditional-fixes.md)

- **Use Tabs** Set to true to use tabs or leave unchecked to use spaces

- **Tab Width** Specify the number of spaces per indentation level

- **HTML Rules** Add the rules you want to use to format your HTML, here's an example of the available options:  
**Note: Please read and make sure you understand the options otherwise do not move anything here, check all the available options here [html-options.md](html-options.md)**

```
max_preserve_newlines: 10
preserve_newlines: true
indent_scripts: "keep"
```


#### Blade Options

- **Format Blade files on save** Enable or disable format on save for blade files **.blade.php**

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

- **Use Tabs** Set to true to use tabs or leave unchecked to use spaces

- **Tab Width** Specify the number of spaces per indentation level

- **Twig Rules** Add the rules you want to use to format your Twig file, for more information about the options see **[twig-options.md](twig-options.md)**

```
preserve: 3
new_line: true
```
