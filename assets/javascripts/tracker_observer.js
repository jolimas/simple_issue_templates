// This file specifically monitors for any changes to the tracker dropdown,
// including AJAX updates that might replace the original select element

document.addEventListener('DOMContentLoaded', function() {
  // Function to set up the tracker change monitoring
  function setupTrackerMonitoring() {
    const trackerSelect = document.getElementById('issue_tracker_id');
    if (!trackerSelect) {
      return false;
    }

    // If this tracker already has our monitoring, don't add it again
    if (trackerSelect.dataset.observerAttached === 'true') {
      return true;
    }

    // Keep track of the last value to detect real changes
    let lastValue = trackerSelect.value;
    trackerSelect.dataset.lastValue = lastValue;

    // Mark this tracker as having our monitoring
    trackerSelect.dataset.observerAttached = 'true';

    // Function to manually trigger the template update when tracker changes
    trackerSelect._manuallyTriggerTemplateUpdate = function() {
      const newValue = this.value;

      if (newValue !== this.dataset.lastValue) {
        // Update the last value for future changes
        this.dataset.lastValue = newValue;

        // Manually trigger our template update logic
        // First clear description
        const descriptionField = document.getElementById('issue_description');
        if (descriptionField) {
          descriptionField.value = '';
          descriptionField.dataset.userModified = 'false';
        }

        // Call updateTemplateOptions if it exists
        if (typeof window.updateTemplateOptions === 'function') {
          window.updateTemplateOptions(true);
        }

        // Direct template application as backup
        setTimeout(() => {
          const templateSelect = document.getElementById('issue_template_id');
          if (templateSelect && templateSelect.value) {
            if (typeof window.applyIssueTemplate === 'function') {
              window.applyIssueTemplate(templateSelect.value, true);
            }

            // Direct content fetch and application
            fetch(`/issue_templates/get_templates?template_type=creation&template_id=${templateSelect.value}&timestamp=${new Date().getTime()}&nocache=${Math.random()}`)
              .then(response => response.json())
              .then(data => {
                if (data.length > 0) {
                  const template = data[0];

                  // Apply directly to description
                  const desc = document.getElementById('issue_description');
                  if (desc) {
                    desc.value = template.content;
                    desc.dispatchEvent(new Event('input', { bubbles: true }));
                    desc.dispatchEvent(new Event('change', { bubbles: true }));
                  }

                  // Use the forceTextareaContent method if available
                  if (typeof window.forceTextareaContent === 'function') {
                    window.forceTextareaContent('issue_description', template.content);
                  }
                }
              })
              .catch(err => {
                console.error('Error fetching template:', err);
              });
          }
        }, 300);
      }
    };

    // Create MutationObserver to watch for attribute changes to the select
    const trackerObserver = new MutationObserver(function(mutations) {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
          trackerSelect._manuallyTriggerTemplateUpdate();

          // Add extra checks after Redmine completes its AJAX operations
          setTimeout(() => {
            const templateSelect = document.getElementById('issue_template_id');
            const descriptionField = document.getElementById('issue_description');

            if (templateSelect && templateSelect.value && descriptionField) {
              // Get the template content directly to verify/enforce
              fetch(`/issue_templates/get_templates?template_type=creation&template_id=${templateSelect.value}&timestamp=${new Date().getTime()}&nocache=${Math.random()}`)
                .then(response => response.json())
                .then(data => {
                  if (data.length > 0) {
                    const template = data[0];

                    // If content doesn't match, force it
                    if (descriptionField.value !== template.content) {
                      // Use most aggressive method
                      if (typeof window.forceTextareaContent === 'function') {
                        window.forceTextareaContent('issue_description', template.content);
                      } else {
                        // Direct assignment as fallback
                        descriptionField.value = template.content;
                        descriptionField.dispatchEvent(new Event('input', { bubbles: true }));
                        descriptionField.dispatchEvent(new Event('change', { bubbles: true }));
                      }
                    }
                  }
                })
                .catch(err => {
                  console.error('Error in template verification:', err);
                });
            }
          }, 1000); // Wait 1 second for Redmine's AJAX to complete
        }
      }
    });

    // Watch for attribute changes
    trackerObserver.observe(trackerSelect, {
      attributes: true,
      attributeFilter: ['value']
    });

    // Override the original onchange handler
    const originalOnchange = trackerSelect.onchange;
    trackerSelect.onchange = function(e) {
      // Call the original handler first
      if (typeof originalOnchange === 'function') {
        originalOnchange.call(this, e);
      }

      // Then call our handler
      this._manuallyTriggerTemplateUpdate();
    };

    // Also add a standard event listener as backup
    trackerSelect.addEventListener('change', function() {
      this._manuallyTriggerTemplateUpdate();
    });

    return true;
  }

  // Try to set up monitoring immediately
  setupTrackerMonitoring();

  // Also set up a MutationObserver to detect if the form is updated via AJAX
  const formObserver = new MutationObserver(function(mutations) {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // If the form was possibly updated, check if we need to reattach our monitoring
        const trackerSelect = document.getElementById('issue_tracker_id');
        if (trackerSelect && trackerSelect.dataset.observerAttached !== 'true') {
          setupTrackerMonitoring();
        }
      }
    }
  });

  // Observe the entire document for new elements being added
  formObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Also check periodically for any new form elements in case the MutationObserver misses something
  const checkInterval = setInterval(function() {
    setupTrackerMonitoring();
  }, 5000); // Check every 5 seconds

  // Stop checking after 5 minutes (should be enough for any user interaction)
  setTimeout(function() {
    clearInterval(checkInterval);
  }, 300000);
});
