# Need some help configuring PHPCS Fixer?

As you know this extension uses php-cs-fixer under the hood to format PHP code, if you are not able to see any difference when formatting then please make sure that a standard is selected in the extension preferences, if you are using a config file please verify your rules.

The extension works without the need of specifying `Additional fixer rules`, you just need to select a standard and that's it, by default the extension will use the standard PSR-12 but you can change that in the extension preferences.

## Using a php-cs-fixer config file

If you want you can keep your rules in a separate file, that way if later you use another code editor you can keep using the same file. This is really simple, just follow this steps:

1.- Create a file in yoiur computer called "**php-cs-fixer.php-cs**" (or .php_cs or .php_cs.dist or .php-cs-fixer.php or .php-cs-fixer.dist.php)
This file can be in your dropbox or google drive folder

2.- Add the following code to the file. (Modify as you need)

### If you are using php-cs-fixer-3.x (You can enable it in the extension preferences "Enable PHP CS Fixer 3")

If you already have a configuration file for a previous version of php-cs-fixer please take a look at the [Upgrade Guide](https://github.com/FriendsOfPHP/PHP-CS-Fixer/blob/v3.0.0/UPGRADE-v3.md) as some option have changed.

```php
<?php

$config = new PhpCsFixer\Config();
return $config
->setRiskyAllowed(true)
->setRules([
    '@PSR12' => true,
    'array_indentation' => true,
    'array_syntax' => ['syntax' => 'short'],
    //Other rules here...
])
->setLineEnding("\n");

```



### If you are using an older version of php-cs-fixer-2.x (PLEASE NOTE: V2 is no longer maintained and will be removed in the near future. Make sure to enable "Enable PHP CS Fixer 3" in the extension preferences and create the file using the correct config.)

```php
<?php

return PhpCsFixer\Config::create()
    ->setRules([
        '@PSR12' => true,
        'array_indentation' => true,
        'array_syntax' => ['syntax' => 'short'],
        //Other rules here...
    ])
    ->setLineEnding("\n");
```

By default phpcs fixer uses spaces, if you want to use tabs you can define in your rules `->setIndent("\t")` just before `->setLineEnding("\n");`

You can see all available rules [here](https://github.com/FriendsOfPHP/PHP-CS-Fixer/blob/3.0/doc/rules/index.rst) or if you prefer [here](https://mlocati.github.io/php-cs-fixer-configurator/#version:3.0)


3.- Go to the extension preferences and select the file you just created and that's it

![image info](https://github.com/biati-digital/nova-php-cs-fixer/blob/main/phpcsfixer.novaextension/Images/extension/rules-file.png?raw=true)



