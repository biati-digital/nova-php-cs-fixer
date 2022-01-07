## Version 4.1.0

- Updated: PHP-CS-Fixer to 3.4.0

## Version 4.0.2

- Fixed: Creating temp files on file paths that contain numbers.
- Updated: PHP path option now is a path select field
- Updated: README

## Version 4.0.1

- New: New extension icon
- Updated: README

## Version 4.0.0

**IMPORTANT:** This update includes php-cs-fixer 3.0.2 (need to be enabled in the extension preferences). If you have a custom configuration please check the [Upgrade Guide](https://github.com/FriendsOfPHP/PHP-CS-Fixer/blob/v3.0.0/UPGRADE-v3.md). php-cs-fixer-2-x is no longer maintained and will be removed in the near future so make sure to enable v3.

- Updated: PHP CS Fixer to 2.19.2 (will soon be removed as it's no longer maintained)
- Added: PHP CS Fixer 3.1.0 River For now you need to enable V3 in the extension preferences and test your configuration, V2 will be removed in the near future so you have time to make the change
- Added: New option "Enable PHP CS Fixer 3" You might need restart
- Added: New option "Format on save only if workspace has a config file"
- Fixed: Twig not respecting custom user rules
- Fixed: PHP CS Fixer additional rules not working
- Updated: js-beautify to 1.14.0

## Version 3.1.0

- New: Files are cached by php-cs-fixer to improve formatting speed
- New: Added new option **Format on save only if workspace has a config file**
- Fixed: Improved HTML indent_with_tabs setting

## Version 3.0.2

- Fixed: Blade @Page tag in Blade -> DomPDF
- Fixed: Blade @if in HTML tag

## Version 3.0.1

- Improved: handling previous preferences

## Version 3.0.0

- New: Added new option to select the coding standard
- New: Added WordPress standard with custom rules
- New: added support for the extension advphp
- New: Now you can configure the extension to respect Nova's preference for indentation, this also adds support for .editorconfig
- New: The formatter now updates tabLength and softTabs in the active editor if Nova automatically detects a different and incorrect tabLength
- New: Let Nova restore the cursor position/selection after formatting
- Improved: Formatting speed on large PHP files
- Improved: Indentation in certain files with mixed PHP and HTML
- Updated: PHP CS Fixer to 2.18.3

## Version 2.0.5

- Fixed: Blade @php and @endphp blocks not indented correctly

## Version 2.0.4

- Minor improvements

## Version 2.0.3

- Fixed: Blade comments
- Fixed: PHP inside HTML script tags

## Version 2.0.2

- Improved: Blade debug logs to display more information

## Version 2.0.1

- Fixed: Indentation error in blade files for elseif|else inside if blocks

## Version 2.0.0

- New: Added support for blade files
- New: Added support for twig files
- New: Added support for workspace configuration
- New: New HTML additional fixes
- Fixed: Indentation error in PHP files with HTML and additional fixes enabled
- Code updates

## Version 1.0.3

- Removed hack to autosave the file when formatting is done, Requires Nova v2 as it includes a fix for this so the hack is no longer necessary

## Version 1.0.2

- Updated: Added more HTML additional fixes
- Updated: Added funding link, any amount is appreciated and it helps me to continue the development of the extension

## Version 1.0.1

- New: Added new option for HTML "Apply Additional fixes" to imrpove even more the formatting when using PHP and HTML in the same file
- New: Added new option to ignore format on save for remote files
- New: Do nothing if the formatted text and the original text are the same, no need to update the editor or resave the file
- New: Do cleanup on deactivate event, this will remove all temp files generated in the workspaceStoragePath directory
- Updated: Changed Format HTML in PHP files to active by default
- Updated: Added link in the extension preferences to view all the available php-cs-fixer options
- Updated: Added link in the extension preferences to view all the additional HTML/PHP fixes

## Version 1.0

Initial release
