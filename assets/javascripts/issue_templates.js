function applyIssueTemplate(templateId) {
  if (!templateId) return;

  // Get template content via AJAX
  fetch('/issue_templates/get_templates?template_type=creation&template_id=' + templateId)
    .then(response => response.json())
    .then(data => {
      if (data.length > 0) {
        const template = data[0];
        const descriptionField = document.getElementById('issue_description');

        if (descriptionField) {
          // If description is empty, replace it
          if (!descriptionField.value.trim()) {
            descriptionField.value = template.content;
          } else {
            // If description has content, ask user if they want to append or replace
            if (confirm('Description field has content. Do you want to append the template? (Cancel to replace)')) {
              descriptionField.value += '\n\n' + template.content;
            } else {
              descriptionField.value = template.content;
            }
          }

          // Focus on the description field
          descriptionField.focus();

          // If using a rich text editor, trigger change event
          if (typeof descriptionField.onchange === 'function') {
            descriptionField.onchange();
          }
        }
      }
    })
    .catch(error => {
      console.error('Error applying template:', error);
      alert('Error applying template');
    });
}

// Update templates when tracker changes
document.addEventListener('DOMContentLoaded', function() {
  const trackerSelect = document.getElementById('issue_tracker_id');
  const templateSelect = document.getElementById('issue_template_id');

  if (trackerSelect && templateSelect) {
    trackerSelect.addEventListener('change', function() {
      updateTemplateOptions();
    });
  }
});

function updateTemplateOptions() {
  const trackerSelect = document.getElementById('issue_tracker_id');
  const templateSelect = document.getElementById('issue_template_id');
  const projectId = document.querySelector('input[name="issue[project_id]"]')?.value ||
                    document.getElementById('issue_project_id')?.value;

  if (!trackerSelect || !templateSelect) return;

  const trackerId = trackerSelect.value;

  // Clear current options
  templateSelect.innerHTML = '<option value="">' + templateSelect.dataset.placeholder + '</option>';

  if (!trackerId) return;

  // Fetch templates for this tracker and project
  const params = new URLSearchParams({
    template_type: 'creation',
    tracker_id: trackerId
  });

  if (projectId) {
    params.append('project_id', projectId);
  }

  fetch('/issue_templates/get_templates?' + params.toString())
    .then(response => response.json())
    .then(templates => {
      templates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = template.name;
        templateSelect.appendChild(option);
      });
    })
    .catch(error => {
      console.error('Error fetching templates:', error);
    });
}
