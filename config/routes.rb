Rails.application.routes.draw do
  resources :issue_templates do
    member do
      patch :reorder
    end
    collection do
      get :get_templates
    end
  end
end
