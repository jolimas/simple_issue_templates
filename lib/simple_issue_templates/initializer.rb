module SimpleIssueTemplates
  class Initializer
    def self.setup!
      # Ensure plugin settings exist
      ensure_plugin_settings!

      # Create default templates if none exist
      create_default_templates! if IssueTemplate.count == 0
    rescue => e
      Rails.logger.error "SimpleIssueTemplates initialization error: #{e.message}"
      Rails.logger.error e.backtrace.join("\n")
    end

    private

    def self.ensure_plugin_settings!
      # Check if plugin settings exist
      plugin_name = 'simple_issue_templates'

      existing_setting = Setting.find_by(name: "plugin_#{plugin_name}")

      unless existing_setting
        Rails.logger.info "Creating plugin settings for #{plugin_name}"

        default_settings = {
          'enable_creation_templates' => true,
          'enable_status_templates' => true
        }

        Setting.create!(
          name: "plugin_#{plugin_name}",
          value: default_settings.to_yaml
        )

        Rails.logger.info "Plugin settings created successfully"
      end
    end

    def self.create_default_templates!
      Rails.logger.info "Creating default issue templates"

      # Default creation templates
      creation_templates = [
        {
          name: 'Bug Report',
          content: "## Bug Description\n\n[Describe the bug in detail]\n\n## Steps to Reproduce\n\n1. \n2. \n3. \n\n## Expected Behavior\n\n[What should happen]\n\n## Actual Behavior\n\n[What actually happens]\n\n## Environment\n\n- Browser: \n- OS: \n- Version: ",
          template_type: 'creation',
          enabled: true,
          position: 1,
          project_id: nil,
          tracker_id: nil,
          status_id: nil,
          is_global: true
        },
        {
          name: 'Feature Request',
          content: "## Feature Description\n\n[Describe the feature you'd like to see]\n\n## Use Case\n\n[Explain why this feature would be useful]\n\n## Acceptance Criteria\n\n- [ ] \n- [ ] \n- [ ] \n\n## Additional Context\n\n[Any additional information]",
          template_type: 'creation',
          enabled: true,
          position: 2,
          project_id: nil,
          tracker_id: nil,
          status_id: nil,
          is_global: true
        }
      ]

      # Default status change templates
      status_templates = [
        {
          name: 'In Progress Notes',
          content: "## Work Started\n\n[Describe what work has begun]\n\n## Next Steps\n\n- [ ] \n- [ ] \n\n## Estimated Completion\n\n[When do you expect this to be done?]",
          template_type: 'status_change',
          enabled: true,
          position: 1,
          project_id: nil,
          tracker_id: nil,
          status_id: nil,
          is_global: true
        },
        {
          name: 'Testing Notes',
          content: "## Testing Performed\n\n- [ ] Unit tests\n- [ ] Integration tests\n- [ ] Manual testing\n\n## Test Results\n\n[Describe test outcomes]\n\n## Known Issues\n\n[Any issues found during testing]",
          template_type: 'status_change',
          enabled: true,
          position: 2,
          project_id: nil,
          tracker_id: nil,
          status_id: nil,
          is_global: true
        },
        {
          name: 'Resolution Notes',
          content: "## Resolution Summary\n\n[How was this issue resolved?]\n\n## Changes Made\n\n- \n- \n\n## Testing\n\n[How was the fix verified?]\n\n## Follow-up Actions\n\n[Any additional work needed?]",
          template_type: 'status_change',
          enabled: true,
          position: 3,
          project_id: nil,
          tracker_id: nil,
          status_id: nil,
          is_global: true
        }
      ]

      # Create templates
      (creation_templates + status_templates).each do |template_attrs|
        template = IssueTemplate.create!(template_attrs)
        Rails.logger.info "Created template: #{template.name} (#{template.template_type})"
      end

      Rails.logger.info "Default templates created successfully"
    end
  end
end
