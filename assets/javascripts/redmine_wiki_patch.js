// This file contains enhanced patches for the Redmine wiki editor to ensure
// template content is properly applied when trackers are changed

document.addEventListener('DOMContentLoaded', function() {
  // Add a specific script attribute to identify already-processed textareas
  const PROCESSED_ATTR = 'data-template-editor-patched';

  // Flag to track if our continuous monitoring is active
  window.wikiPatchMonitoringActive = false;  // Function to directly update textarea and editor content
  window.forceTextareaContent = function(textareaId, content) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return false;

    // Store timestamp to track if content was successfully applied
    const updateTimestamp = new Date().getTime();
    window.lastTemplateUpdateTimestamp = updateTimestamp;

    // 1. Apply content to textarea using multiple methods
    textarea.value = content;

    // 2. Try to update the attribute too
    textarea.setAttribute('value', content);

    // 3. Force value using property descriptor if possible
    try {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      if (descriptor && descriptor.set) {
        descriptor.set.call(textarea, content);
      }
    } catch(e) {
      // Property descriptor approach failed
    }

    // Method 1: Try jsToolBar direct access
    if (window['jsToolBar_' + textareaId]) {
      const toolbar = window['jsToolBar_' + textareaId];

      // Make sure the textarea syncs with our content
      if (toolbar.textarea) {
        toolbar.textarea.value = content;

        // Also try setting node value
        if (toolbar.textarea.firstChild) {
          toolbar.textarea.firstChild.nodeValue = content;
        }
      }

      // Try to refresh it
      if (typeof toolbar.refresh === 'function') {
        toolbar.refresh();
      }
    }

    // Method 2: Try wikiToolbar
    if (window.wikiToolbar) {
      for (const key in window.wikiToolbar) {
        if (window.wikiToolbar[key] && window.wikiToolbar[key].textarea === textarea) {
          window.wikiToolbar[key].textarea.value = content;

          if (typeof window.wikiToolbar[key].refresh === 'function') {
            window.wikiToolbar[key].refresh();
            return true;
          }
        }
      }
    }    // Trigger multiple events to ensure change detection
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    textarea.dispatchEvent(new KeyboardEvent('keyup'));
    textarea.dispatchEvent(new KeyboardEvent('keydown'));

    // Setup persistent content checking to ensure updates are applied
    const originalValue = content;
    const checkInterval = 50; // ms
    const maxRetries = 10;
    let retryCount = 0;

    // Setup a verification interval to ensure content is actually applied
    const verifyInterval = setInterval(() => {
      // Only verify if this is still our latest update request
      if (window.lastTemplateUpdateTimestamp !== updateTimestamp) {
        clearInterval(verifyInterval);
        return;
      }

      // Check if content is actually applied
      const currentValue = textarea.value;
      retryCount++;

      if (currentValue !== originalValue) {
        // Try again to force update
        textarea.value = originalValue;

        // Try direct DOM manipulation as a last resort
        if (retryCount >= 3) {
          // Targeted DOM approach for Redmine editor
          const editorId = textarea.id;

          // Try every method we know again
          if (window['jsToolBar_' + editorId]) {
            const toolbar = window['jsToolBar_' + editorId];
            toolbar.textarea.value = originalValue;
          }

          // Force update using property descriptor again
          try {
            const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
            if (descriptor && descriptor.set) {
              descriptor.set.call(textarea, originalValue);
            }
          } catch(e) {}

          // Dispatch more events
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } else {
        clearInterval(verifyInterval);
      }

      // Stop after max retries to avoid infinite loops
      if (retryCount >= maxRetries) {
        clearInterval(verifyInterval);
      }
    }, checkInterval);

    return true;
  };

  // Monitor for changes to description field value from template selection
  function patchTextArea(textArea) {
    if (!textArea || textArea.getAttribute(PROCESSED_ATTR) === 'true') {
      return; // Already processed
    }

    textArea.setAttribute(PROCESSED_ATTR, 'true');

    // Create a more robust property setter/getter for the textarea value
    // This helps us intercept any attempts to change the value
    const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    if (originalDescriptor && originalDescriptor.configurable) {
      let textAreaValue = textArea.value;

      Object.defineProperty(textArea, 'value', {
        get: function() {
          return textAreaValue;
        },
        set: function(val) {
          textAreaValue = val;
          originalDescriptor.set.call(this, val);

          // Update any associated editor
          const editorId = this.id;
          if (window['jsToolBar_' + editorId]) {
            const toolbar = window['jsToolBar_' + editorId];

            if (toolbar.textarea) {
              toolbar.textarea.value = val;
            }
          }

          // Dispatch events to ensure other scripts know about this change
          setTimeout(() => {
            this.dispatchEvent(new Event('input', { bubbles: true }));
            this.dispatchEvent(new Event('change', { bubbles: true }));
          }, 0);
        },
        enumerable: true,
        configurable: true
      });
    }

    // Also monitor the textarea for programmatic changes via attributes
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
          // If we have an editor object, update it
          const editorId = textArea.id;
          if (window['jsToolBar_' + editorId]) {
            const toolbar = window['jsToolBar_' + editorId];

            if (toolbar.textarea) {
              toolbar.textarea.value = textArea.value;
            }
          }
        }
      });
    });

    // Start observing the textarea's attributes
    observer.observe(textArea, {
      attributes: true,
      attributeFilter: ['value']
    });
  }

  // Patch the original wiki toolbar initialization
  const originalWikiToolbarInit = window.wikiToolbarInit;
  if (originalWikiToolbarInit) {
    window.wikiToolbarInit = function() {
      // Call the original initialization first
      originalWikiToolbarInit.apply(this, arguments);

      // Now enhance all textareas with wiki toolbars
      document.querySelectorAll('textarea.wiki-edit').forEach(textArea => {
        patchTextArea(textArea);
      });

      // Always ensure issue_description is patched
      const descriptionField = document.getElementById('issue_description');
      if (descriptionField) {
        patchTextArea(descriptionField);
      }
    };
  }

  // Also intercept jsToolBar initialization directly
  if (typeof jsToolBar !== 'undefined') {
    // Store the original initialization method
    const originalJsToolBarInit = jsToolBar.prototype.initialize;

    // Replace with our enhanced version
    jsToolBar.prototype.initialize = function() {
      // Call the original implementation
      originalJsToolBarInit.apply(this, arguments);

      // Add our extensions for templates
      if (this.textarea) {
        patchTextArea(this.textarea);

        // Store a reference to this toolbar on the textarea
        this.textarea.jsToolBar = this;
      }
    };
  }

  // Immediately process any existing textareas
  setTimeout(function() {
    // Patch any description field
    const descriptionField = document.getElementById('issue_description');
    if (descriptionField) {
      patchTextArea(descriptionField);

      // If toolbar already exists, ensure it's properly linked
      const editorId = descriptionField.id;
      if (window['jsToolBar_' + editorId]) {
        const toolbar = window['jsToolBar_' + editorId];

        // Make sure toolbar and textarea reference each other
        descriptionField.jsToolBar = toolbar;
        toolbar.textarea = descriptionField;
      }
    }

    // Process all wiki-edit fields
    document.querySelectorAll('textarea.wiki-edit').forEach(textArea => {
      patchTextArea(textArea);
    });
  }, 100);

  // Set up continuous monitoring to handle AJAX updates
  function setupContinuousMonitoring() {
    if (window.wikiPatchMonitoringActive) return;

    window.wikiPatchMonitoringActive = true;

    // Function to check and ensure description field is patched
    function ensureDescriptionPatched() {
      const descField = document.getElementById('issue_description');
      if (descField && descField.getAttribute(PROCESSED_ATTR) !== 'true') {
        patchTextArea(descField);

        // If a template was recently applied, ensure content is still correct
        const templateSelect = document.getElementById('issue_template_id');
        if (templateSelect && templateSelect.value) {
          // Direct method call if function exists
          if (typeof window.applyIssueTemplate === 'function') {
            window.applyIssueTemplate(templateSelect.value, true);
          }
        }
      }
    }

    // Check periodically for unpatched textareas
    const patchInterval = setInterval(ensureDescriptionPatched, 2000);

    // Also set up a MutationObserver to detect form changes
    const formObserver = new MutationObserver(function(mutations) {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Search for textareas in added nodes
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const textareas = node.querySelectorAll('textarea');
              if (textareas.length > 0) {
                ensureDescriptionPatched();
                break;
              }
            }
          }
        }
      }
    });

    // Watch for changes to the form or content area
    const formElement = document.querySelector('form#issue-form');
    if (formElement) {
      formObserver.observe(formElement, { childList: true, subtree: true });
    }

    // Also watch the main content area
    const contentElement = document.querySelector('#content');
    if (contentElement) {
      formObserver.observe(contentElement, { childList: true, subtree: true });
    }
  }

  // Start continuous monitoring after a short delay
  setTimeout(setupContinuousMonitoring, 500);
});
