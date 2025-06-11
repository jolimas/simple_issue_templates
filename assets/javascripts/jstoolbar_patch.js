// Direct patch for Redmine's jsToolBar to ensure templates are properly applied
// This specifically targets the integration between the issue_templates plugin and Redmine's wiki editor

document.addEventListener('DOMContentLoaded', function() {
  // Wait for jsToolBar to be defined
  const waitForJsToolbar = function(callback, maxAttempts = 10) {
    let attempts = 0;

    const checkForJsToolbar = function() {
      attempts++;

      if (typeof jsToolBar !== 'undefined') {
        callback();
      } else if (attempts < maxAttempts) {
        setTimeout(checkForJsToolbar, 100);
      }
    };

    checkForJsToolbar();
  };

  waitForJsToolbar(function() {
    // Direct patch for jsToolBar initialization
    const originalJsToolBarInit = jsToolBar.prototype.initialize;

    // Add a direct global content update function for use by our template handler
    window.updateTemplateInToolbar = function(textareaId, content) {
      // Find all toolbar instances
      const editorInstances = [];

      // Check for global toolbar reference
      if (window['jsToolBar_' + textareaId]) {
        editorInstances.push(window['jsToolBar_' + textareaId]);
      }

      // Look for any toolbar objects that match our textarea
      const textarea = document.getElementById(textareaId);
      if (textarea) {
        // Find all toolbar instances
        document.querySelectorAll('.jstEditor').forEach(editor => {
          const editorTextarea = editor.querySelector('textarea');
          if (editorTextarea === textarea && editor.jsToolBar) {
            editorInstances.push(editor.jsToolBar);
          }
        });

        // Apply content to each found instance
        editorInstances.forEach(toolbar => {
          // Update the textarea through the toolbar
          if (toolbar.textarea) {
            toolbar.textarea.value = content;
          }

          // Try to refresh the toolbar
          if (typeof toolbar.refresh === 'function') {
            toolbar.refresh();
          }
        });

        // If no toolbar instances found, update directly
        if (editorInstances.length === 0) {
          textarea.value = content;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    };

    // Replace the initialization function with our patched version
    jsToolBar.prototype.initialize = function() {
      // Call original initialization
      originalJsToolBarInit.apply(this, arguments);

      // Add our custom enhancement
      if (this.textarea && this.textarea.id === 'issue_description') {
        // Add a direct reference from the textarea to the toolbar for easier access
        this.textarea.jsToolBar = this;

        // Store the textarea globally for direct access
        window.issueDescriptionTextarea = this.textarea;
        window.issueDescriptionToolbar = this;

        // Track the original setValue function
        const originalSetValue = this.textarea.value;
        const toolbar = this;

        // Function to update toolbar when content changes
        this.updateForTemplate = function(content) {
          // Update textarea content
          this.textarea.value = content;

          // Make sure the toolbar knows about the change
          if (typeof this.refresh === 'function') {
            this.refresh();
          }
        };

        // Expose the function through window for easy access
        if (window.templateToolbarUpdaters === undefined) {
          window.templateToolbarUpdaters = {};
        }
        window.templateToolbarUpdaters[this.textarea.id] = this.updateForTemplate.bind(this);
      }
    };
  });

  // Add global helper function to update templates in toolbars
  window.updateTemplateInToolbar = function(textareaId, content) {
    // Method 1: Try our direct updater
    if (window.templateToolbarUpdaters && window.templateToolbarUpdaters[textareaId]) {
      window.templateToolbarUpdaters[textareaId](content);
      return true;
    }

    // Method 2: Try to find the toolbar instance directly
    const toolbarInstance = window['jsToolBar_' + textareaId];
    if (toolbarInstance) {
      // Update the textarea
      if (toolbarInstance.textarea) {
        toolbarInstance.textarea.value = content;
      }

      // Refresh the toolbar
      if (typeof toolbarInstance.refresh === 'function') {
        toolbarInstance.refresh();
      }

      return true;
    }

    // Method 3: Find the textarea and update it directly
    const textarea = document.getElementById(textareaId);
    if (textarea) {
      textarea.value = content;

      // Find any editor container
      const editorContainer = textarea.closest('.jstEditor');
      if (editorContainer) {
        // Try to find any controls we can refresh
        const previewButton = editorContainer.querySelector('.jstb_preview');
        if (previewButton && typeof previewButton.click === 'function') {
          setTimeout(() => {
            // Toggle preview to force refresh
            previewButton.click();
            setTimeout(() => previewButton.click(), 100);
          }, 200);
        }
      }

      return true;
    }

    return false;
  };
});

// Create special event listener to update templates in toolbars
document.addEventListener('template:apply', function(e) {
  if (e.detail && e.detail.textareaId && e.detail.content) {
    window.updateTemplateInToolbar(e.detail.textareaId, e.detail.content);
  }
});
