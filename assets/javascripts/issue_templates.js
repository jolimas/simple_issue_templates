function applyIssueTemplate(templateId, forceReplace = false) {
  if (!templateId) return;

  // Get template content via AJAX - add a different timestamp to avoid caching
  const fetchUrl = `/issue_templates/get_templates?template_type=creation&template_id=${templateId}&timestamp=${new Date().getTime()}&nocache=${Math.random()}`;

  fetch(fetchUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Network response error: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.length > 0) {
        const template = data[0];
        const descriptionField = document.getElementById('issue_description');

        if (descriptionField) {
          // If template is being applied due to tracker change, always update content
          if (forceReplace || !descriptionField.value.trim() || !descriptionField.dataset.userModified) {
            // Store the old value for debugging
            const oldValue = descriptionField.value;

            try {
              // IMPORTANT FIX: Make sure we're getting a fresh DOM element reference
              const freshDescriptionField = document.getElementById('issue_description');

              // Try direct property assignment - always use the fresh reference
              freshDescriptionField.value = template.content;

              // Reset the user modified flag
              freshDescriptionField.dataset.userModified = 'false';

              // Check if this field has a jstEditor attached (Redmine's wiki editor)
              const editorContainer = freshDescriptionField.closest('.jstEditor');
              if (editorContainer) {
                // Try to access the jsToolBar instance directly from the container
                const editorId = freshDescriptionField.id;
                if (window['jsToolBar_' + editorId]) {
                  const toolbar = window['jsToolBar_' + editorId];
                  if (toolbar.textarea) {
                    toolbar.textarea.value = template.content;
                  }
                }

                // Also try JSTT if it exists
                if (typeof JSTT !== 'undefined' && JSTT.instance) {
                  if (typeof JSTT.instance.textArea !== 'undefined' && JSTT.instance.textArea === freshDescriptionField) {
                    JSTT.instance.setContent(template.content);
                  }
                }
              }

              // Try multiple event dispatching approaches for maximal browser compatibility
              freshDescriptionField.dispatchEvent(new Event('input', { bubbles: true }));
              freshDescriptionField.dispatchEvent(new Event('change', { bubbles: true }));
              freshDescriptionField.dispatchEvent(new KeyboardEvent('keyup'));

              // Update textarea value attribute as well (for some editor implementations)
              freshDescriptionField.setAttribute('value', template.content);

              // If there's a form, mark it as having pending changes
              const form = freshDescriptionField.closest('form');
              if (form && typeof form.onchange === 'function') {
                form.onchange();
              }
            } catch (err) {
              console.error('Error updating description field:', err);
            }


          } else {
            // If description has content and was modified by user, ask before replacing
            if (confirm('Description field has content. Do you want to append the template? (Cancel to replace)')) {
              descriptionField.value += '\n\n' + template.content;
            } else {
              descriptionField.value = template.content;
              descriptionField.dataset.userModified = 'false';
            }
          }

          // Focus on the description field
          descriptionField.focus();

          // If using a rich text editor, trigger change event
          if (typeof descriptionField.onchange === 'function') {
            descriptionField.onchange();
          }

          // Additional trigger for any DOM watchers with a slightly longer delay
          // to ensure the browser has time to process the earlier events
          setTimeout(() => {
            // Force the browser to recognize the content change
            descriptionField.dispatchEvent(new Event('change', { bubbles: true }));

            // Look for Redmine-specific wiki toolbar and trigger its update
            updateWikiToolbar(descriptionField);

            // Try using our enhanced toolbar update mechanism if available
            if (typeof window.updateTemplateInToolbar === 'function') {
              window.updateTemplateInToolbar(descriptionField.id, template.content);
            }

            // Also dispatch a custom event that our jstoolbar_patch.js can listen for
            const templateEvent = new CustomEvent('template:apply', {
              bubbles: true,
              detail: {
                textareaId: descriptionField.id,
                content: template.content
              }
            });
            document.dispatchEvent(templateEvent);
          }, 50);

          // Add a final fallback refresh with a longer delay
          setTimeout(() => {
            // Set content again and trigger another round of events
            if (descriptionField.value !== template.content) {
              descriptionField.value = template.content;
              descriptionField.dispatchEvent(new Event('input', { bubbles: true }));
              descriptionField.dispatchEvent(new Event('change', { bubbles: true }));

              // One last direct attempt with any available API
              if (typeof window.forceTextareaContent === 'function') {
                window.forceTextareaContent(descriptionField.id, template.content);
              }
            }
          }, 200);
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
  fetch('/issue_templates/get_templates?template_type=status_change&template_id=' + templateId + '&timestamp=' + new Date().getTime(), {
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
  const descriptionField = document.getElementById('issue_description');

  if (trackerSelect && templateSelect) {
    // Keep track of the last tracker ID to detect actual changes
    let lastTrackerId = trackerSelect.value;

    // Track if we've seen this tracker before to prevent duplicates
    const seenTrackers = new Set();
    if (lastTrackerId) {
      seenTrackers.add(lastTrackerId);
    }

    // Add change event listener with stronger handling
    trackerSelect.addEventListener('change', function() {
      const currentTrackerId = this.value;

      // Update the last tracker ID for next change

      // Update the last tracker ID for next change
      lastTrackerId = currentTrackerId;
      seenTrackers.add(currentTrackerId);

      // Always update templates when tracker changes, with a small delay for DOM stability
      // First clear description to avoid showing old content with new template
      const currentDescription = document.getElementById('issue_description');
      if (currentDescription) {
        currentDescription.value = '';
        currentDescription.dataset.userModified = 'false';
      }

      // Important: Multiple attempts to update templates with increasing delays
      // This handles cases where network, DOM updates, or async operations could cause issues
      setTimeout(() => {
        updateTemplateOptions(true); // Force refresh
      }, 50);

      setTimeout(() => {
        const selectedTemplate = document.getElementById('issue_template_id')?.value;
        if (selectedTemplate) {
          applyIssueTemplate(selectedTemplate, true); // Force replace
        }
      }, 500);

      // Third attempt with direct wiki toolbar integration
      setTimeout(() => {
        const currentTemplateId = document.getElementById('issue_template_id')?.value;
        if (currentTemplateId && typeof window.forceTextareaContent === 'function') {
          // Fetch the template content directly
          fetch(`/issue_templates/get_templates?template_type=creation&template_id=${currentTemplateId}&timestamp=${new Date().getTime()}&nocache=${Math.random()}`)
            .then(response => response.json())
            .then(data => {
              if (data.length > 0) {
                const template = data[0];
                // Use the specialized function from redmine_wiki_patch.js
                window.forceTextareaContent('issue_description', template.content);
              }
            })
            .catch(err => {
              console.error('Error in template final attempt:', err);
            });
        }
      }, 800);

      // Fourth attempt after a longer delay in case of slow network or processing delays
      setTimeout(() => {
        const currentTemplateId = document.getElementById('issue_template_id')?.value;
        const descriptionField = document.getElementById('issue_description');

        if (currentTemplateId && descriptionField) {
          // Direct approach using all available methods to ensure update
          fetch(`/issue_templates/get_templates?template_type=creation&template_id=${currentTemplateId}&timestamp=${new Date().getTime()}&nocache=${Math.random()}`)
            .then(response => response.json())
            .then(data => {
              if (data.length > 0) {
                const template = data[0];

                // 1. Direct assignment through our enhanced method
                if (typeof window.forceTextareaContent === 'function') {
                  window.forceTextareaContent('issue_description', template.content);
                }

                // 2. Also ensure native DOM update regardless
                descriptionField.value = template.content;
                descriptionField.dispatchEvent(new Event('input', { bubbles: true }));
                descriptionField.dispatchEvent(new Event('change', { bubbles: true }));

                // 3. Look for TEXTAREA in the preview area as fallback
                const previewArea = document.querySelector('.jstEditor .wiki-preview');
                if (previewArea) {
                  const previewTextarea = previewArea.querySelector('textarea');
                  if (previewTextarea) {
                    previewTextarea.value = template.content;
                  }
                }
              }
            })
            .catch(err => {
              console.error('Error in template failsafe attempt:', err);
            });
        }
      }, 1200);
    });

    // Ensure templates are correctly loaded on initial page load
    setTimeout(() => {
      if (!templateSelect.options || templateSelect.options.length <= 1 || !templateSelect.value) {
        updateTemplateOptions();
      } else if (templateSelect.value) {
        // If there's already a template selected, make sure it's applied
        applyIssueTemplate(templateSelect.value);
      }
    }, 100);
  }

  // Track if the user has modified the description field
  if (descriptionField) {
    descriptionField.addEventListener('input', function() {
      descriptionField.dataset.userModified = 'true';
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

  // Start observing forms for changes
  // For edit form
  const editForm = document.querySelector('form.edit_issue');
  if (editForm) {
    observer.observe(editForm, { childList: true, subtree: true });
  }

  // For new issue form
  const newForm = document.querySelector('form#issue-form');
  if (newForm) {
    observer.observe(newForm, { childList: true, subtree: true });
  }
});

// Helper function to update the Redmine wiki toolbar if it exists
function updateWikiToolbar(textArea) {
  // Always ensure we're working with the latest DOM reference
  const currentTextArea = document.getElementById(textArea.id) || textArea;

  // Get the current content that should be reflected in the editor
  const contentToApply = currentTextArea.value;

  // Try all known methods to update Redmine's wiki toolbar

  // 1. Check if Redmine's wikiToolbar variable is accessible
  if (typeof wikiToolbar !== 'undefined') {
    // Check if this textarea has a toolbar associated
    for (const key in wikiToolbar) {
      if (wikiToolbar[key] && wikiToolbar[key].textarea === currentTextArea) {
        if (typeof wikiToolbar[key].refresh === 'function') {
          wikiToolbar[key].refresh();
        }
      }
    }
  }

  // 2. Look for Redmine's jsToolBar instances - most common in Redmine
  const editorId = currentTextArea.id;
  if (editorId) {
    // Direct access to jsToolBar instance by ID
    if (window['jsToolBar_' + editorId]) {
      const toolbar = window['jsToolBar_' + editorId];

      // Try to update the textarea content through the toolbar
      if (toolbar.textarea) {
        toolbar.textarea.value = contentToApply;

        // If there's a refresh method, call it
        if (typeof toolbar.refresh === 'function') {
          toolbar.refresh();
        }
      }
    }
  }

  // 3. Look for the editor container and try to access the toolbar
  const editorContainer = currentTextArea.closest('.jstEditor');
  if (editorContainer) {
    // Try to get toolbar by container ID
    const toolbarContainer = editorContainer.querySelector('.jstElements');
    if (toolbarContainer && toolbarContainer.id) {
      const toolbarId = toolbarContainer.id.replace('jstElements_', '');
      if (typeof window['wikiToolbar_' + toolbarId] !== 'undefined') {
        const toolbar = window['wikiToolbar_' + toolbarId];
        if (toolbar.textarea) {
          toolbar.textarea.value = contentToApply;
        }
        if (typeof toolbar.refresh === 'function') {
          toolbar.refresh();
        }
      }
    }

    // Try to get toolbar directly from editor container
    if (editorContainer.jsToolBar) {
      const toolbar = editorContainer.jsToolBar;
      if (toolbar.textarea) {
        toolbar.textarea.value = contentToApply;
      }
      if (typeof toolbar.refresh === 'function') {
        toolbar.refresh();
      }
    }

    // Check for any preview areas that need updating
    const previewArea = editorContainer.querySelector('.wiki-preview');
    if (previewArea) {
      // Try to trigger a preview refresh if available
      if (typeof wikiPreviewRefresh === 'function') {
        wikiPreviewRefresh(currentTextArea);
      }
    }
  }

  // 4. For other rich text editors that might be integrated
  if (currentTextArea.id) {
    // Look for CKEditor integration
    if (typeof CKEDITOR !== 'undefined' && CKEDITOR.instances[currentTextArea.id]) {
      CKEDITOR.instances[currentTextArea.id].setData(contentToApply);
    }

    // Look for TinyMCE integration
    if (typeof tinymce !== 'undefined' && tinymce.get(currentTextArea.id)) {
      tinymce.get(currentTextArea.id).setContent(contentToApply);
    }
  }

  // Finally, ensure the textarea itself has the current content
  if (currentTextArea.value !== contentToApply) {
    currentTextArea.value = contentToApply;
  }
}

function updateTemplateOptions(forceRefresh = false) {
  const trackerSelect = document.getElementById('issue_tracker_id');
  const templateSelect = document.getElementById('issue_template_id');
  const projectId = document.querySelector('input[name="issue[project_id]"]')?.value ||
                    document.getElementById('issue_project_id')?.value;

  if (!trackerSelect || !templateSelect) return;

  const trackerId = trackerSelect.value;



  // Set placeholder if not already set
  const placeholder = templateSelect.dataset.placeholder || 'Select a template...';

  // Clear current options and set placeholder
  templateSelect.innerHTML = '<option value="">' + placeholder + '</option>';

  if (!trackerId) return;

  // Fetch templates for this tracker and project
  const params = new URLSearchParams({
    template_type: 'creation',
    tracker_id: trackerId,
    timestamp: new Date().getTime(), // Prevent caching
    sequence: (window.templateFetchCounter = (window.templateFetchCounter || 0) + 1) // Ensure uniqueness
  });

  if (projectId) {
    params.append('project_id', projectId);
  }

  fetch('/issue_templates/get_templates?' + params.toString())
    .then(response => {
      if (!response.ok) {
        throw new Error(`Network response error: ${response.status}`);
      }
      return response.json();
    })
    .then(templates => {


      // Update the templates dropdown
      templates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = template.name;
        templateSelect.appendChild(option);
      });

      // If templates are found, select the first one and apply it
      if (templates.length > 0) {
        // Select the first template and store it
        templateSelect.value = templates[0].id;
        templateSelect.dataset.lastAppliedTemplate = templates[0].id;

        // Check if the template actually changed
        const templateChanged = templates[0].id !== (templateSelect.dataset.previousId || '');

        // Get the current description field (always refresh reference)
        const descriptionField = document.getElementById('issue_description');

        // Reset any user modification flags to ensure template gets applied
        if (descriptionField) {
          descriptionField.dataset.userModified = 'false';

          // Clear the content to ensure the new template is applied
          descriptionField.value = '';
          descriptionField.dispatchEvent(new Event('input', { bubbles: true }));
          descriptionField.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // First try: Normal template application with force flag
        applyIssueTemplate(templates[0].id, true);

        // Second try (delayed): Direct fallback approach for template application
        setTimeout(() => {
          // Get fresh references to DOM elements
          const currentTemplateSelect = document.getElementById('issue_template_id');
          const currentDescField = document.getElementById('issue_description');

          // Make sure we have the current selected template
          const templateId = currentTemplateSelect?.value || templates[0].id;

          if (currentDescField && (!currentDescField.value || forceRefresh)) {
            // Directly fetch and apply template content as a fallback
            const fetchUrl = `/issue_templates/get_templates?template_type=creation&template_id=${templateId}&timestamp=${new Date().getTime()}&nocache=${Math.random()}`;

            fetch(fetchUrl)
              .then(response => response.json())
              .then(data => {
                if (data.length > 0) {
                  const template = data[0];

                  // Apply content directly to textarea
                  currentDescField.value = template.content;

                  // Trigger events on the textarea
                  currentDescField.dispatchEvent(new Event('input', { bubbles: true }));
                  currentDescField.dispatchEvent(new Event('change', { bubbles: true }));

                  // Force update to the wiki toolbar
                  updateWikiToolbar(currentDescField);

                  // Try using the direct wiki toolbar integration if available
                  if (typeof window.forceTextareaContent === 'function') {
                    window.forceTextareaContent('issue_description', template.content);
                  } else {
                    // Extra measure: directly manipulate the DOM property
                    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(
                      currentDescField, template.content
                    );
                  }

                  // Final check - directly update the jstEditor if present
                  const jstEditorId = 'jsToolBar_' + currentDescField.id;
                  if (window[jstEditorId] && window[jstEditorId].textarea) {
                    window[jstEditorId].textarea.value = template.content;
                  }
                }
              })
              .catch(err => {
                console.error('Error in template fallback fetch:', err);
              });
          }
        }, 300);

        // Explicitly trigger a change event on the template select
        const changeEvent = new Event('change', { bubbles: true });
        templateSelect.dispatchEvent(changeEvent);

        // Store the current template ID for future reference
        templateSelect.dataset.previousId = templates[0].id;
        templateSelect.dataset.previousName = templates[0].name;
      } else {
        // Clear the description field if no templates are available
        const descriptionField = document.getElementById('issue_description');
        if (descriptionField && !descriptionField.dataset.userModified) {
          descriptionField.value = '';
        }


      }
    })
    .catch(error => {
      console.error('Error fetching templates:', error);

    });
}
