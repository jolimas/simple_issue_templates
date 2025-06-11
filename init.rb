Redmine::Plugin.register :simple_issue_templates do
  name 'Simple Issue Templates'
  author 'Custom Plugin'
  description 'Provides issue templates for creation and status changes'
  version '1.0.0'
  url 'https://github.com/your-repo/simple_issue_templates'
  author_url 'https://github.com/your-repo'

  # Minimum Redmine version required
  requires_redmine :version_or_higher => '4.0.0'

  # Include CSS and JavaScript files
  Rails.application.config.assets.precompile += %w(issue_templates.css issue_templates.js)

  # Permission for managing templates
  permission :manage_issue_templates, {
    :issue_templates => [:index, :new, :create, :edit, :update, :destroy]
  }

  # Add menu item to administration
  menu :admin_menu, :issue_templates, { :controller => 'issue_templates', :action => 'index' },
       :caption => 'Issue Templates',
       :html => {:class => 'icon icon-issue'}

  # Settings
  settings :default => {
    'enable_creation_templates' => true,
    'enable_status_templates' => true
  }, :partial => 'settings/simple_issue_templates'
end

# Load the plugin
require File.dirname(__FILE__) + '/lib/simple_issue_templates'
