// This file adds a mutation observer specifically for the description field content
// to ensure template changes are properly applied

document.addEventListener('DOMContentLoaded', function() {
  // Set up a system to monitor and verify template content changes
  function setupDescriptionFieldMonitoring() {
    const descriptionField = document.getElementById('issue_description');
    if (!descriptionField) {
      setTimeout(setupDescriptionFieldMonitoring, 500);
      return;
    }

    // Create a template state object to track changes
    window.templateState = {
      contentApplied: false,
      lastContent: '',
      lastTemplateId: '',
      lastTrackerId: '',
      attempts: 0,
      maxAttempts: 10,
      lastUpdateTimestamp: new Date().getTime()
    };

    // Function to verify content was properly applied
    window.verifyTemplateContent = function(expectedContent, templateId) {
      const descriptionField = document.getElementById('issue_description');
      if (!descriptionField) return false;

      const trackerSelect = document.getElementById('issue_tracker_id');
      const currentTrackerId = trackerSelect ? trackerSelect.value : '';

      const currentContent = descriptionField.value;

      // Update state
      window.templateState.lastTemplateId = templateId;
      window.templateState.lastTrackerId = currentTrackerId;
      window.templateState.lastUpdateTimestamp = new Date().getTime();
      window.templateState.attempts++;

      if (currentContent === expectedContent) {
        window.templateState.contentApplied = true;
        window.templateState.lastContent = currentContent;
        window.templateState.attempts = 0;
        return true;
      } else {
        // Apply content directly if it doesn't match
        if (window.templateState.attempts < window.templateState.maxAttempts) {
          // Record what we're trying to apply
          window.attemptedTemplateContent = expectedContent;

          // Try our best approaches to update content
          descriptionField.value = expectedContent;

          // Use the enhanced toolbar method if available
          if (typeof window.forceTextareaContent === 'function') {
            window.forceTextareaContent('issue_description', expectedContent);
          }

          // Also use updateTemplateInToolbar if available
          if (typeof window.updateTemplateInToolbar === 'function') {
            window.updateTemplateInToolbar('issue_description', expectedContent);
          }
        }

        return false;
      }
    };

    // Set up a mutation observer to watch for DOM changes affecting the description field
    const observer = new MutationObserver(function(mutations) {
      // Detect changes to the description field
      const isChangeRelevant = mutations.some(mutation => {
        // Check if this is a direct change to our field
        if (mutation.target === descriptionField) return true;

        // Check if a child was added/removed in an ancestor element that might affect field
        if (mutation.type === 'childList' &&
            (descriptionField.contains(mutation.target) || mutation.target.contains(descriptionField))) {
          return true;
        }

        return false;
      });

      // If we found a relevant change, verify the content
      if (isChangeRelevant && window.templateState.lastContent) {
        // Verify content is still correct
        const currentContent = descriptionField.value;
        if (currentContent !== window.templateState.lastContent) {
          // Content has changed
        }
      }
    });

    // Start observing the description field
    observer.observe(descriptionField, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true
    });

    // Also observe the parent form for broader changes
    const form = descriptionField.closest('form');
    if (form) {
      observer.observe(form, {
        childList: true,
        subtree: true
      });
    }
  }

  // Start monitoring after a short delay to ensure the page is fully loaded
  setTimeout(setupDescriptionFieldMonitoring, 300);
});
