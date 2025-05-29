# Simple Issue Templates Plugin for Redmine

## Description

The Simple Issue Templates Plugin enhances Redmine's issue management by allowing administrators to define reusable templates for issue descriptions. These templates can be automatically applied when creating new issues or when changing issue statuses, streamlining the issue creation process and ensuring consistency across your projects.

## Features

- **Auto-selection of templates** when creating new issues
- **Status-based templates** that automatically load when changing issue status
- **WYSIWYG editor with preview** for creating rich-text templates
- **Template reordering** for customizing the display order
- **Global and project-specific templates** for flexible management
- **Tracker-specific filtering** to show relevant templates only
- **Status-specific targeting** for status change templates

## Screenshots

*[Screenshots to be added]*

## Requirements

- Redmine 5.0.0 or higher
- Ruby 2.7 or higher
- Rails 6.1 or higher

## Installation

1. Clone the repository into your Redmine plugins directory:
   ```
   cd /path/to/redmine/plugins
   git clone https://github.com/joaolimas/simple_issue_templates.git
   ```

2. Install dependencies (if any):
   ```
   cd /path/to/redmine
   bundle install
   ```

3. Run the plugin migrations:
   ```
   cd /path/to/redmine
   bundle exec rake redmine:plugins:migrate RAILS_ENV=production
   ```

4. Restart your Redmine application:
   ```
   touch tmp/restart.txt   # for Passenger
   # or restart your web server (Apache, Nginx, etc.)
   ```

## Usage

### Managing Templates

1. **Access the template management interface**:
   - Go to **Administration > Issue Templates**
   - You need to have administrative privileges

2. **Creating a new template**:
   - Click "New Template"
   - Fill in the required information:
     - **Name**: A descriptive name for the template
     - **Description** (optional): What the template is for
     - **Template Type**: Choose between "Creation Template" or "Status Change Template"
     - **Global template**: Check if the template should be available in all projects
     - **Project**: Select a specific project (if not global)
     - **Tracker**: Select a specific tracker (or leave blank for all trackers)
     - **Status** (for Status Change templates only): Select the status that triggers this template
     - **Position**: Order number for display (can be changed later)
     - **Enabled**: Whether the template is active
     - **Content**: The actual template content (supports Redmine's text formatting)

3. **Editing templates**:
   - Click on the template name in the list
   - Make your changes and save

4. **Reordering templates**:
   - Use the Up/Down arrows in the template list to change their display order
   - Templates are ordered by their template type

### Using Templates

#### For End Users (Issue Creation)

When creating a new issue, the appropriate template will be automatically applied to the issue description field based on:
- The current project
- The selected tracker
- Template availability and enabled status

#### For End Users (Status Changes)

When changing an issue's status, the appropriate template will be automatically loaded when:
- The status matches a status change template
- The template matches the current project and tracker
- The template is enabled

### Template Content

Template content supports Redmine's text formatting syntax, including:
- Wiki formatting (Textile or Markdown depending on your Redmine configuration)
- Links to other issues, documents, and wiki pages
- Macros
- Tables
- Text formatting (bold, italic, etc.)

## Configuration

No additional configuration is required for basic functionality. The plugin automatically:
- Creates necessary database tables upon installation
- Registers itself with Redmine
- Sets up default settings

## Uninstallation

1. Run the plugin removal migrations:
   ```
   cd /path/to/redmine
   bundle exec rake redmine:plugins:migrate NAME=simple_issue_templates VERSION=0 RAILS_ENV=production
   ```

2. Remove the plugin directory:
   ```
   rm -rf /path/to/redmine/plugins/simple_issue_templates
   ```

3. Restart your Redmine application.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin new-feature`
5. Submit a pull request

## License

This plugin is licensed under the [GNU License](LICENSE).

## Author

João Limas / Pictonio Lda. with help of Github Copilot

## Support

For issues and feature requests, please use the [issue tracker](https://github.com/joaolimas/simple_issue_templates/issues).

## Changelog

### v1.0.0 (May 28, 2025)
- Initial release with all core features:
  - Auto-select templates on issue creation
  - Auto-select templates on status changes
  - WYSIWYG editor with preview
  - Template reordering functionality
  - Global and project-specific templates
  - Tracker-specific filtering
  - Status-specific targeting
