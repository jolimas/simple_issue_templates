class IssueTemplatesController < ApplicationController
  before_action :require_admin, except: [:get_templates]
  before_action :find_template, only: [:show, :edit, :update, :destroy, :reorder]
  protect_from_forgery with: :exception

  def index
    @templates = IssueTemplate.includes(:project, :tracker)
                             .order(:template_type, :project_id, :tracker_id, :position)
    @templates_by_type = @templates.group_by(&:template_type)
  end

  def show
  end

  def new
    @template = IssueTemplate.new
    @template.template_type = params[:template_type] || 'creation'
  end

  def create
    @template = IssueTemplate.new(template_params)

    if @template.save
      flash[:notice] = l(:notice_successful_create)
      redirect_to issue_templates_path
    else
      render :new
    end
  end

  def edit
  end

  def update
    if @template.update(template_params)
      flash[:notice] = l(:notice_successful_update)
      redirect_to issue_templates_path
    else
      render :edit
    end
  end

  def destroy
    @template.destroy
    flash[:notice] = l(:notice_successful_delete)
    redirect_to issue_templates_path
  end  # Reorder templates
  def reorder
    direction = params[:direction]
    template_type = @template.template_type

    begin
      # Debug logging
      Rails.logger.info "Reordering template #{@template.id} (#{@template.name}) in direction: #{direction}"
      Rails.logger.info "Current position: #{@template.position}, Template type: #{template_type}"

      case direction
      when 'up'
        move_up(@template, template_type)
      when 'down'
        move_down(@template, template_type)
      else
        raise ArgumentError, "Invalid direction: #{direction}"
      end

      # Force reload to get the updated position
      @template.reload
      Rails.logger.info "New position after reordering: #{@template.position}"

      respond_to do |format|
        format.js # renders reorder.js.erb
        format.html { redirect_to issue_templates_path }
        format.json { render json: { success: true, position: @template.position } }
      end
    rescue => e
      Rails.logger.error "Template reorder error: #{e.message}"
      Rails.logger.error e.backtrace.join("\n")
      respond_to do |format|
        format.js { render json: { error: e.message }, status: :unprocessable_entity }
        format.html {
          flash[:error] = "Failed to reorder template: #{e.message}"
          redirect_to issue_templates_path
        }
        format.json { render json: { error: e.message }, status: :unprocessable_entity }
      end
    end
  end

  # AJAX endpoint to get templates based on criteria
  def get_templates
    # If a specific template_id is requested, return just that template
    if params[:template_id].present?
      template = IssueTemplate.enabled.find_by(id: params[:template_id])
      if template && template_accessible?(template)
        render json: [{
          id: template.id,
          name: template.name,
          description: template.description,
          content: template.content
        }]
      else
        render json: []
      end
      return
    end

    # Otherwise, filter templates based on criteria
    templates = IssueTemplate.enabled

    if params[:template_type].present?
      templates = templates.where(template_type: params[:template_type])
    end

    if params[:project_id].present?
      project_id = params[:project_id].to_i
      templates = templates.where('project_id IS NULL OR project_id = ?', project_id)
    end

    if params[:tracker_id].present?
      tracker_id = params[:tracker_id].to_i
      templates = templates.where('tracker_id IS NULL OR tracker_id = ?', tracker_id)
    end

    if params[:status_id].present? && params[:template_type] == 'status_change'
      status_id = params[:status_id].to_i
      templates = templates.where('issue_status_id IS NULL OR issue_status_id = ?', status_id)
    end

    templates = templates.order(:position, :name)

    render json: templates.map { |t|
      {
        id: t.id,
        name: t.name,
        description: t.description,
        content: t.content
      }
    }
  end

  private

  def find_template
    @template = IssueTemplate.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render_404
  end

  def template_params
    params.require(:issue_template).permit(
      :name, :description, :content, :template_type, :project_id,
      :tracker_id, :issue_status_id, :position, :enabled, :is_global
    )
  end

  def move_up(template, template_type)
    templates = IssueTemplate.where(template_type: template_type).order(:position, :id).to_a
    current_index = templates.index { |t| t.id == template.id }

    Rails.logger.info "Moving template UP - Current index: #{current_index}, Total templates: #{templates.size}"

    if current_index && current_index > 0
      other_template = templates[current_index - 1]
      Rails.logger.info "Swapping with template #{other_template.id} (#{other_template.name}) at position #{other_template.position}"
      swap_positions(template, other_template)
    else
      Rails.logger.info "Cannot move up - already at top or index not found"
    end
  end

  def move_down(template, template_type)
    templates = IssueTemplate.where(template_type: template_type).order(:position, :id).to_a
    current_index = templates.index { |t| t.id == template.id }

    Rails.logger.info "Moving template DOWN - Current index: #{current_index}, Total templates: #{templates.size}"

    if current_index && current_index < templates.length - 1
      other_template = templates[current_index + 1]
      Rails.logger.info "Swapping with template #{other_template.id} (#{other_template.name}) at position #{other_template.position}"
      swap_positions(template, other_template)
    else
      Rails.logger.info "Cannot move down - already at bottom or index not found"
    end
  end

  def swap_positions(template1, template2)
    Rails.logger.info "Before swap: Template1 pos=#{template1.position}, Template2 pos=#{template2.position}"

    IssueTemplate.transaction do
      temp_position = template1.position
      template1.update!(position: template2.position)
      template2.update!(position: temp_position)
    end

    Rails.logger.info "After swap: Template1 pos=#{template1.position}, Template2 pos=#{template2.position}"
  end

  # Check if user can access the template
  def template_accessible?(template)
    # Global templates are accessible by anyone
    return true if template.is_global || template.project_id.nil?

    # Otherwise check if the user has view permission for the project
    project = Project.find_by(id: template.project_id)
    return false unless project

    User.current.allowed_to?(:view_issues, project)
  end
end
