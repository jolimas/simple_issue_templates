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

// Status change template handling
function applyStatusTemplate(templateId) {
  // Clear the notes field first
  const notesField = document.getElementById('issue_notes');
  if (notesField) {
    notesField.value = '';
    // Trigger change event for any listeners
    const event = new Event('change', { bubbles: true });
    notesField.dispatchEvent(event);
  }

  if (!templateId) {
    return; // No template selected, field already cleared
  }

  // Fetch the template content
  fetch('/issue_templates/get_templates?template_type=status_change&template_id=' + templateId, {
    headers: { 'X-Requested-With': 'XMLHttpRequest' }
  })
  .then(response => response.json())
  .then(data => {
    if (data.length > 0) {
      const template = data[0];

      if (notesField) {
        notesField.value = template.content;
        notesField.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else {
      console.log('No template data received');
    }
  })
  .catch(error => {
    console.error('Error loading template:', error);
  });
}

// Handle status changes
function handleStatusChange(statusId) {
  if (!statusId) return;

  // Find templates for this status
  fetch('/issue_templates/get_templates?template_type=status_change&status_id=' + statusId, {
    headers: { 'X-Requested-With': 'XMLHttpRequest' }
  })
  .then(response => response.json())
  .then(data => {
    const templateSelect = document.getElementById('status_template_id');
    if (!templateSelect) return;

    if (data.length > 0) {
      // Found a matching template
      templateSelect.value = data[0].id;
      applyStatusTemplate(data[0].id);
    } else {
      // Clear template selection and notes field if no template matches
      templateSelect.value = '';
      const notesField = document.getElementById('issue_notes');
      if (notesField) {
        notesField.value = '';
      }
    }
  })
  .catch(error => {
    console.error('Error finding templates:', error);
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

  // Set up status change handlers
  const statusSelect = document.getElementById('issue_status_id');
  const statusTemplateSelect = document.getElementById('status_template_id');

  if (statusSelect) {
    // Add event listener for status changes
    statusSelect.addEventListener('change', function() {
      handleStatusChange(this.value);
    });

    // Auto-select template for initial status if applicable
    if (statusSelect.value && statusTemplateSelect) {
      handleStatusChange(statusSelect.value);
    }
  }

  if (statusTemplateSelect) {
    // Add event listener for manual template selection
    statusTemplateSelect.addEventListener('change', function() {
      applyStatusTemplate(this.value);
    });
  }
});

// Set up a MutationObserver to handle AJAX form updates
document.addEventListener('DOMContentLoaded', function() {
  const observer = new MutationObserver(function(mutations) {
    for (let mutation of mutations) {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        // Check if relevant elements were added to the DOM
        const statusSelect = document.getElementById('issue_status_id');
        const statusTemplateSelect = document.getElementById('status_template_id');

        // Re-attach events if needed
        if (statusSelect && !statusSelect.dataset.hasListener) {
          statusSelect.addEventListener('change', function() {
            handleStatusChange(this.value);
          });
          statusSelect.dataset.hasListener = 'true';

          // Try to automatically apply template for current status
          if (statusSelect.value && statusTemplateSelect) {
            handleStatusChange(statusSelect.value);
          }
        }

        if (statusTemplateSelect && !statusTemplateSelect.dataset.hasListener) {
          statusTemplateSelect.addEventListener('change', function() {
            applyStatusTemplate(this.value);
          });
          statusTemplateSelect.dataset.hasListener = 'true';
        }
      }
    }
  });

  // Start observing form for changes
  const form = document.querySelector('form.edit_issue');
  if (form) {
    observer.observe(form, { childList: true, subtree: true });
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
