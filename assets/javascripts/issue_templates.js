function applyIssueTemplate(templateId) {
  if (!templateId) {
    return;
  }

  const descriptionField = document.getElementById('issue_description');
  if (!descriptionField) {
    console.error('Description field not found at the start of applyIssueTemplate.');
  }

  // Get template content via AJAX
  fetch('/issue_templates/get_templates?template_type=creation&template_id=' + templateId)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      if (data.length > 0) {
        const template = data[0];
        const descriptionField = document.getElementById('issue_description');

        // Enhanced debugging for description field updates
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
        } else {
          console.error('Description field not found.');
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

    templateSelect.addEventListener('change', function() {
      applyIssueTemplate(templateSelect.value);
    });
  } else {
    console.error('Tracker select or template select element not found.');
  }

  // Debugging: Reattach event listener for templateSelect on DOM updates
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length > 0) {
        const updatedTemplateSelect = document.getElementById('issue_template_id');
        if (updatedTemplateSelect && !updatedTemplateSelect.dataset.listenerAttached) {
          updatedTemplateSelect.addEventListener('change', function() {
            applyIssueTemplate(updatedTemplateSelect.value);
          });
          updatedTemplateSelect.dataset.listenerAttached = 'true';
        }
      }
    });
  });

  const form = document.querySelector('form.edit_issue');
  if (form) {
    observer.observe(form, { childList: true, subtree: true });
  }

});

// Set up a MutationObserver to handle AJAX form updates
document.addEventListener('DOMContentLoaded', function() {
  const observer = new MutationObserver(function(mutations) {
    for (let mutation of mutations) {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        // Check if relevant elements were added to the DOM
        const trackerSelect = document.getElementById('issue_tracker_id');
        const templateSelect = document.getElementById('issue_template_id');

        if (trackerSelect) {
          trackerSelect.dataset.hasListener = 'false'; // Reset listener flag
          trackerSelect.addEventListener('change', function() {
            updateTemplateOptions();
          });
          trackerSelect.dataset.hasListener = 'true';
        }

        if (templateSelect) {
          templateSelect.dataset.hasListener = 'false'; // Reset listener flag
          templateSelect.addEventListener('change', function() {
            applyIssueTemplate(templateSelect.value);
          });
          templateSelect.dataset.hasListener = 'true';
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

  if (!trackerSelect || !templateSelect) {
    console.error('Tracker select or template select element missing during update.');
    return;
  }

  const placeholder = templateSelect.dataset.placeholder || 'Select a template...';
  templateSelect.innerHTML = '<option value="">' + placeholder + '</option>';

  const trackerId = trackerSelect.value;

  if (!trackerId) {
    return;
  }

  // Fetch templates for this tracker and project
  const params = new URLSearchParams({
    template_type: 'creation',
    tracker_id: trackerId
  });

  if (projectId) {
    params.append('project_id', projectId);
  }

  fetch('/issue_templates/get_templates?' + params.toString())
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(templates => {

      // Append templates as options to the dropdown
      templates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = template.name || `Template ${template.id}`;
        templateSelect.appendChild(option);
      });

      // Ensure type matching for tracker comparison
      const matchingTemplate = templates.find(template => String(template.tracker_id) === String(trackerId));
      if (matchingTemplate) {
        templateSelect.value = matchingTemplate.id;
      } else if (templates.length > 0) {
        templateSelect.value = templates[0].id;
      }

      // Ensure the selected value exists in the dropdown
      if (Array.from(templateSelect.options).some(option => option.value === String(templateSelect.value))) {
      } else {
        console.error('Selected value does not exist in the dropdown options.');
      }

      // Trigger change event for templateSelect to apply the template
      const event = new Event('change', { bubbles: true });
      templateSelect.dispatchEvent(event);
    })
    .catch(error => {
      console.error('Error fetching templates:', error);
    });
}
