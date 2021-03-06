views.RecipeCreator = views.AA_BaseForm.extend({

	events: _.extend({
		// 'submit form': 'createRecipe',
	}, views.AA_BaseForm.prototype.events),

	initialize: function(opts){
		this.recipe_schema = opts.recipeSchema.schema;
		this.event_schema = opts.recipeSchema.default_event;

		this.$form = this.$el.find('form');
		this.$defaultEvents = this.$el.find('.default-event-container');
		// var recipe_creator_schemas = $.extend(true, {}, pageData.eventCreatorSchema);

		// Add default values to the schema under the `selected` property
		// event_creator_schema = this.combineFormSchemaWithVals(event_creator_schema, options.defaults);

		// Store this on the schema with this article's information on the view
		// We will re-render the view on form submit, rendering makes a copy of these initial settings
		// this.schema = event_creator_schema;


		// Bake the modal container and form elements
		this.render();
		// Init the title searcher and pikaday
		this.renderDefaultEvent();
		this.postRender();

		return this;
	},

	render: function(){
		var markup = '',
				recipe_schema = this.recipe_schema,
				default_event_markup

		// Bake the initial form data
		_.each(recipe_schema, function(fieldData, fieldName){
			markup += this.bakeFormInputRow.call(this, fieldName, fieldData);
		}, this);

		// markup += this.bakeButtons();

		this.$form.prepend(markup);

		default_event_markup = this.renderDefaultEvent();

		this.$defaultEvents.html(default_event_markup);
		// Preload with empty arrays for impact_tags and assignees
		// Selected values will be added on load
		this.event_data = {
			impact_tags: [],
			assignees: []
		};

		return this;
	},

	renderDefaultEvent: function(){
		var markup = '',
				default_event_schema = this.event_schema;

		// Bake the initial form data
		_.each(default_event_schema, function(fieldData, fieldName){
			markup += this.bakeFormInputRow.call(this, fieldName, fieldData, 'default_event');
		}, this);

		return markup
	},

	formListToObject: function(){
		var form_data = this.event_creator_options;
		var form_obj = {
			impact_tags: [],
			assignees: []
		};
		form_data.forEach(function(formItem){
			var name = formItem.name,
					form_value = formItem.selected;
			if (name != 'impact_tags' && name != 'assignees'){
				form_obj[name] = form_value;
			} else {
				form_obj[name].push(form_value);
			}
		});
		return form_obj;
	},

	getSettings: function(){

		this.$el.find('.form-row-input-container select').each(function(i,el){
			$(el).trigger('change');
		})

		// Don't give this back
		delete this.event_data['assignees-selector'];

		return this.event_data;

	}

});