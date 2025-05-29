module SimpleIssueTemplates
  class ViewHooks < Redmine::Hook::ViewListener
    # Include CSS and JavaScript in the header
    def view_layouts_base_html_head(context={})
      stylesheet_link_tag('issue_templates', :plugin => 'simple_issue_templates') +
      javascript_include_tag('issue_templates', :plugin => 'simple_issue_templates')
    end

    # Add template selector to new issue form
    def view_issues_form_details_bottom(context={})
      issue = context[:issue]
      project = context[:project]

      return '' unless project && issue && issue.new_record?

      # Check if creation templates are enabled
      return '' unless IssueTemplate.creation_templates_enabled?

      begin
        # Get templates available for this project and tracker
        tracker = issue.tracker
        templates = IssueTemplate.available_for_project_and_tracker(project, tracker)

        if templates.any?
          first_template = templates.first
          content = content_tag :div, id: 'issue-templates-section', style: 'border: 1px solid #ddd; padding: 10px; margin: 10px 0; background: #f9f9f9;' do
            content_tag(:h4, 'Issue Templates', style: 'margin-top: 0;') +
            content_tag(:p, style: 'margin-bottom: 0;') do
              select_tag('issue_template_id',
                         options_from_collection_for_select(templates, :id, :name, first_template.id),
                         { onchange: 'applyIssueTemplate(this.value);',
                           style: 'width: 100%; max-width: 300px;' })
            end +
            content_tag(:script, raw("
              // Auto-apply first template on page load
              document.addEventListener('DOMContentLoaded', function() {
                const templateSelect = document.getElementById('issue_template_id');
                if (templateSelect && templateSelect.value) {
                  applyIssueTemplate(templateSelect.value);
                }
              });

              function applyIssueTemplate(templateId) {
                if (!templateId) return;

                fetch('/issue_templates/get_templates?template_type=creation&template_id=' + templateId, {
                  headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                  }
                })
                  .then(response => {
                    if (!response.ok) {
                      throw new Error('Network response was not ok');
                    }
                    return response.json();
                  })
                  .then(data => {
                    if (data.length > 0) {
                      const template = data[0];
                      const descField = document.getElementById('issue_description');
                      if (descField) {
                        descField.value = template.content;
                        // Trigger change event for any listeners
                        const event = new Event('change', { bubbles: true });
                        descField.dispatchEvent(event);
                      }
                    }
                  })
                  .catch(error => {
                    console.error('Error loading template:', error);
                    alert('Error loading template. Please try again.');
                  });
              }
            "))
          end

          return content
        end
      rescue => e
        Rails.logger.error "Error in issue creation template hook: #{e.message}"
        Rails.logger.error e.backtrace.join("\n")
        return '' # Don't show error to user, just log it
      end

      return ''
    end

    # Add template selector to issue edit form for status changes
    def view_issues_edit_notes_bottom(context={})
      issue = context[:issue]

      return '' unless issue

      # Check if status templates are enabled
      return '' unless IssueTemplate.status_templates_enabled?

      begin
        # Get all available status change templates (for now, not filtered by status)
        templates = IssueTemplate.enabled.status_change_templates.ordered

        if templates.any?
          content = content_tag :div, id: 'status-templates-section', style: 'border: 1px solid #ddd; padding: 10px; margin: 10px 0; background: #f9f9f9;' do
            content_tag(:h4, 'Status Change Templates', style: 'margin-top: 0;') +
            content_tag(:p, style: 'margin-bottom: 0;') do               select_tag('status_template_id',
                         options_from_collection_for_select(templates, :id, :name),
                         { include_blank: '-- Select a template or clear notes --',
                           onchange: 'applyStatusTemplate(this.value);',
                           style: 'width: 100%; max-width: 300px;' })
            end
          end

          return content
        end
      rescue => e
        Rails.logger.error "Error in status change template hook: #{e.message}"
        Rails.logger.error e.backtrace.join("\n")
        return '' # Don't show error to user, just log it
      end

      return ''
    end
  end
end
