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

    # Start with global templates
    result = templates.global.to_a

    # Add project-specific templates if we have a project
    if project
      result += templates.for_project(project).to_a
    end

    # Add tracker-specific templates if we have a tracker
    if tracker
      result += templates.for_tracker(tracker).to_a
    end

    # Remove duplicates and return
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
