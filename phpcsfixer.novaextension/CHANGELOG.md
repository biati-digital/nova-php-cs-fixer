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
