class IssueTemplate < ActiveRecord::Base
  belongs_to :project, optional: true
  belongs_to :tracker, optional: true
  belongs_to :issue_status, optional: true

  validates :name, presence: true, length: { maximum: 255 }
  validates :template_type, presence: true, inclusion: { in: %w[creation status_change] }
  validates :content, presence: true

  before_create :set_default_position

  scope :enabled, -> { where(enabled: true) }
  scope :global, -> { where(is_global: true) }
  scope :for_project, ->(project) { where(project: project) }
  scope :for_tracker, ->(tracker) { where(tracker: tracker) }
  scope :for_status, ->(status) { where(issue_status: status) }
  scope :creation_templates, -> { where(template_type: 'creation') }
  scope :status_change_templates, -> { where(template_type: 'status_change') }
  scope :ordered, -> { order(:position, :name) }

  def self.available_for_project_and_tracker(project, tracker)
    templates = enabled.creation_templates.ordered

    # First check for tracker-specific templates
    tracker_specific = []
    if tracker
      # Look for project + tracker specific templates
      if project
        tracker_specific = templates.where(project_id: project.id, tracker_id: tracker.id).to_a
      end

      # If no project+tracker specific templates, check for global tracker-specific templates
      if tracker_specific.empty?
        tracker_specific = templates.where(project_id: nil, tracker_id: tracker.id).to_a
      end
    end

    # If we found tracker-specific templates, return those
    if tracker_specific.any?
      return tracker_specific
    end

    # Otherwise, fall back to project-specific and global templates
    result = []

    # Add project-specific templates if we have a project
    if project
      result += templates.for_project(project).where(tracker_id: nil).to_a
    end

    # Add global templates (no project, no tracker)
    result += templates.where(project_id: nil, tracker_id: nil).to_a

    # Return the result
    result.uniq
  end

  def self.available_for_status_change(project, status)
    templates = enabled.status_change_templates.ordered

    # Get global templates for this status
    global_templates = templates.global.for_status(status)

    # Get project-specific templates for this status
    project_templates = project ? templates.for_project(project).for_status(status) : templates.none

    (global_templates + project_templates).uniq
  end

  def global?
    is_global
  end

  def creation_template?
    template_type == 'creation'
  end

  def status_change_template?
    template_type == 'status_change'
  end

  def self.plugin_settings
    @plugin_settings ||= begin
      setting = Setting.find_by(name: 'plugin_simple_issue_templates')
      setting ? YAML.load(setting.value) : {}
    rescue => e
      Rails.logger.warn "Could not load plugin settings: #{e.message}"
      {}
    end
  end

  def self.creation_templates_enabled?
    plugin_settings['enable_creation_templates'] != false
  end

  def self.status_templates_enabled?
    plugin_settings['enable_status_templates'] != false
  end

  private

  def set_default_position
    if position.blank?
      max_position = IssueTemplate.where(template_type: template_type).maximum(:position) || 0
      self.position = max_position + 1
    end
  end
end
