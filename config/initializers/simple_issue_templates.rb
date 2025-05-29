Rails.application.config.after_initialize do
  # Run setup after all plugins are loaded and database is available
  if Rails.env.development? || Rails.env.production?
    begin
      # Only run if the table exists (plugin is properly migrated)
      if ActiveRecord::Base.connection.table_exists?('issue_templates')
        SimpleIssueTemplates::Initializer.setup!
      end
    rescue => e
      Rails.logger.warn "SimpleIssueTemplates: Could not run initialization: #{e.message}"
    end
  end
end
