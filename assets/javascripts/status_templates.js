function applyStatusTemplate(templateId) {
  if (!templateId) return;

  // Get template content via AJAX
  fetch('/issue_templates/get_templates?template_type=status_change&template_id=' + templateId)
    .then(response => response.json())
    .then(data => {
      if (data.length > 0) {
        const template = data[0];
        const notesField = document.getElementById('issue_notes');

        if (notesField) {
          // Append template to notes
          if (notesField.value.trim()) {
            notesField.value += '\n\n' + template.content;
          } else {
            notesField.value = template.content;
          }

          // Focus on the notes field
          notesField.focus();

          // If using a rich text editor, trigger change event
          if (typeof notesField.onchange === 'function') {
            notesField.onchange();
          }
        }
      }
    })
    .catch(error => {
      console.error('Error applying status template:', error);
      alert('Error applying status template');
    });
}

// Update status templates when status changes
document.addEventListener('DOMContentLoaded', function() {
  const statusSelect = document.getElementById('issue_status_id');
  const templateSelect = document.getElementById('status_template_id');

  if (statusSelect && templateSelect) {
    statusSelect.addEventListener('change', function() {
      updateStatusTemplateOptions();
    });
  }
});

function updateStatusTemplateOptions() {
  const statusSelect = document.getElementById('issue_status_id');
  const templateSelect = document.getElementById('status_template_id');
  const projectId = document.querySelector('input[name="issue[project_id]"]')?.value ||
                    document.getElementById('issue_project_id')?.value;

  if (!statusSelect || !templateSelect) return;

  const statusId = statusSelect.value;

  // Clear current options
  templateSelect.innerHTML = '<option value="">' + (templateSelect.dataset.placeholder || 'Select template...') + '</option>';

  if (!statusId) return;

  // Fetch templates for this status and project
  const params = new URLSearchParams({
    template_type: 'status_change',
    status_id: statusId
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
      console.error('Error fetching status templates:', error);
    });
}
