module SimpleIssueTemplates
  # Hook into Redmine's view rendering
  require File.dirname(__FILE__) + '/simple_issue_templates/view_hooks'
  require File.dirname(__FILE__) + '/simple_issue_templates/initializer'

  # Register assets with Rails asset pipeline
  class Engine < ::Rails::Engine
    initializer 'simple_issue_templates.register_assets' do |app|
      app.config.assets.precompile += %w(issue_templates.css)
      app.config.assets.paths << File.expand_path('../../assets/stylesheets', __dir__)
    end
  end
end
