## Version 2.0.0

- New: Added support for blade files
- New: Added support for twig files
- New: Added support for workspace configuration
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
