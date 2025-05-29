class CreateIssueTemplates < ActiveRecord::Migration[7.0]
  def change
    create_table :issue_templates do |t|
      t.string :name, null: false
      t.text :content
      t.text :description
      t.string :template_type, null: false # 'creation' or 'status_change'
      t.integer :project_id, null: true
      t.integer :tracker_id, null: true
      t.integer :issue_status_id, null: true
      t.integer :position, default: 1
      t.boolean :is_global, default: false
      t.boolean :enabled, default: true
      t.timestamps
    end

    add_foreign_key :issue_templates, :projects, column: :project_id
    add_foreign_key :issue_templates, :trackers, column: :tracker_id
    add_foreign_key :issue_templates, :issue_statuses, column: :issue_status_id

    add_index :issue_templates, :template_type
    add_index :issue_templates, :is_global
    add_index :issue_templates, [:project_id, :template_type]
    add_index :issue_templates, [:tracker_id, :template_type]
    add_index :issue_templates, [:issue_status_id, :template_type]
  end
end
