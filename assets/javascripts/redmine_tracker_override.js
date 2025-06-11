// This file overrides Redmine's tracker change behavior to ensure templates are properly applied

document.addEventListener('DOMContentLoaded', function() {
  // Function to find and patch Redmine's tracker change handlers
  function patchRedmineTrackerChange() {
    // Look for the issue form
    const issueForm = document.querySelector('form.new_issue, form.edit_issue');
    if (!issueForm) {
      return;
    }

    // Find the tracker select element
    const trackerSelect = document.getElementById('issue_tracker_id');
    if (!trackerSelect) {
      return;
    }

    // Store the original onchange handler if it exists
    const originalOnchange = trackerSelect.onchange;

    // Replace the onchange handler with our patched version
    trackerSelect.onchange = function(event) {
      // Call the original onchange handler if it exists
      if (typeof originalOnchange === 'function') {
        originalOnchange.call(this, event);
      }

      // Store information about the current state
      const currentTrackerId = this.value;
      const currentTrackerName = this.options[this.selectedIndex]?.text || 'Unknown';

      // After Redmine has processed the tracker change and updated the form,
      // we need to ensure our template is properly applied
      setTimeout(() => {
        // Access the template select after form has updated
        const templateSelect = document.getElementById('issue_template_id');
        if (templateSelect && templateSelect.value) {

          // Force clear the description field first
          const descField = document.getElementById('issue_description');
          if (descField) {
            descField.value = '';
            descField.dataset.userModified = 'false';
          }

          // Re-apply the selected template with force flag
          if (typeof applyIssueTemplate === 'function') {
            applyIssueTemplate(templateSelect.value, true);

            // Also use our direct API if available for extra assurance
            if (typeof window.forceTextareaContent === 'function') {
              // Fetch the template content
              fetch(`/issue_templates/get_templates?template_type=creation&template_id=${templateSelect.value}&timestamp=${new Date().getTime()}`)
                .then(response => response.json())
                .then(data => {
                  if (data.length > 0) {
                    const template = data[0];
                    window.forceTextareaContent('issue_description', template.content);
                  }
                })
                .catch(err => console.error('Error fetching template:', err));
            }
          }
        }
      }, 500); // Wait longer for Redmine to finish its updates
    };
  }

  // Apply the patch after a delay to ensure all Redmine scripts are loaded
  setTimeout(patchRedmineTrackerChange, 1000);
});
