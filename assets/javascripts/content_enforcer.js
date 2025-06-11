// This file ensures that template content is consistently applied to the description field,
// even after multiple tracker changes or AJAX updates

document.addEventListener('DOMContentLoaded', function() {
  // Keep track of the last chosen template and its content
  window.templateTracker = {
    lastTemplateId: null,
    lastContent: null,
    lastTrackerId: null,
    lastAppliedTimestamp: null
  };

  // Function that directly forces content into the description field when needed
  function enforceTemplateContent() {
    const templateSelect = document.getElementById('issue_template_id');
    const descField = document.getElementById('issue_description');
    const trackerSelect = document.getElementById('issue_tracker_id');

    // If we have no template or description field, nothing to enforce
    if (!templateSelect || !descField) return;

    const currentTemplateId = templateSelect.value;
    const currentTrackerId = trackerSelect ? trackerSelect.value : null;

    // If nothing has changed since last check, no need to enforce
    if (currentTemplateId === window.templateTracker.lastTemplateId &&
        currentTrackerId === window.templateTracker.lastTrackerId &&
        descField.value && descField.value === window.templateTracker.lastContent) {
      return;
    }

    // If we have a template ID but it's different from what we have tracked
    if (currentTemplateId && (
        currentTemplateId !== window.templateTracker.lastTemplateId ||
        currentTrackerId !== window.templateTracker.lastTrackerId ||
        !descField.value ||
        descField.value !== window.templateTracker.lastContent)) {

      // Fetch the template content
      fetch(`/issue_templates/get_templates?template_type=creation&template_id=${currentTemplateId}&timestamp=${new Date().getTime()}&nocache=${Math.random()}`)
        .then(response => response.json())
        .then(data => {
          if (data.length > 0) {
            const template = data[0];

            // Check if we need to update
            if (!descField.value || descField.value !== template.content) {
              // Store the new content
              window.templateTracker.lastTemplateId = currentTemplateId;
              window.templateTracker.lastContent = template.content;
              window.templateTracker.lastTrackerId = currentTrackerId;
              window.templateTracker.lastAppliedTimestamp = new Date().getTime();

              // First try direct set
              descField.value = template.content;

              // Then trigger events
              descField.dispatchEvent(new Event('input', { bubbles: true }));
              descField.dispatchEvent(new Event('change', { bubbles: true }));

              // Also try the forceTextareaContent method if available
              if (typeof window.forceTextareaContent === 'function') {
                window.forceTextareaContent(descField.id, template.content);
              }
            }
          }
        })
        .catch(err => {
          console.error('Error fetching template:', err);
        });
    }
  }

  // Function to check if template has been changed
  function checkTemplateChange() {
    const templateSelect = document.getElementById('issue_template_id');
    if (!templateSelect) return;

    const currentTemplate = templateSelect.value;
    const lastTemplate = templateSelect.dataset.lastCheckedTemplate;

    if (currentTemplate !== lastTemplate) {
      templateSelect.dataset.lastCheckedTemplate = currentTemplate;

      // Template changed, enforce content
      enforceTemplateContent();
    }
  }

  // Run content enforcement periodically to ensure template content sticks
  setInterval(enforceTemplateContent, 2000);

  // Watch for changes to the template selection
  document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'issue_template_id') {
      enforceTemplateContent();
    }
  });

  // Watch for tracker changes
  document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'issue_tracker_id') {
      // Give some time for the template to update first
      setTimeout(enforceTemplateContent, 500);
    }
  });

  // Set up MutationObserver to watch for changes to template select
  const templateObserver = new MutationObserver(function(mutations) {
    checkTemplateChange();
  });

  // Start watching once DOM is fully loaded
  setTimeout(function() {
    const templateSelect = document.getElementById('issue_template_id');
    if (templateSelect) {
      // Initialize last checked template
      templateSelect.dataset.lastCheckedTemplate = templateSelect.value;

      // Start observing
      templateObserver.observe(templateSelect, {
        attributes: true,
        attributeFilter: ['value'],
        childList: true
      });
    }
  }, 500);
});
