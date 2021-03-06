views.RecipeEditor = views.AA_BaseForm.extend({

	events: _.extend({
		'click .modal-outer': 'stopPropagation',
	}, views.AA_BaseForm.prototype.events),

	initialize: function(opts){
		var source = opts.model.source,
				recipe_settings = opts.model.settings,
				default_event_settings = opts.model.default_event;

		var recipe_schema_model = $.extend(true, {}, _.findWhere(pageData.recipeSchemas, {source: source}) ),
				recipe_schema = recipe_schema_model.schema,
				recipe_default_event = recipe_schema_model.default_event;

		// Add default values to the schema, which are under the `selected` property
		recipe_schema = this.combineFormSchemaWithVals(recipe_schema, recipe_settings);
		// And add the name manually
		recipe_schema.name.selected = opts.model.name;
		recipe_default_event = this.combineFormSchemaWithVals(recipe_default_event, default_event_settings);

		// Hydrate default_event selected assignees with full article information
		if (recipe_default_event.assignees.selected){
			recipe_default_event.assignees.selected = recipe_default_event.assignees.selected.map(function(id){
				return _.findWhere(pageData.articleSkeletons, {id: id})
			});
		}

		// Also hydrate impact tags
		if (recipe_default_event.impact_tags.selected) {
			recipe_default_event.impact_tags.selected = recipe_default_event.impact_tags.selected.map(function(id){
				return _.findWhere(recipe_default_event.impact_tags.options, {id: id})
			});
		}


		// Store these for use throughout this view
		this.recipe_schema = recipe_schema;
		this.event_schema = recipe_default_event;

		// Cache some jQuery selectors
		this.$form = this.$el.find('form');
		this.$defaultEvents = this.$el.find('.default-event-container');

		// Bake the modal container and form elements
		this.render();
		// // Init the title searcher and pikaday
		this.postRender();

		return this;
	},

	render: function(){
		var markup = '',
				recipe_schema = this.recipe_schema,
				default_event_markup;

		// Bake the initial form data
		_.each(recipe_schema, function(fieldData, fieldName){
			markup += this.bakeFormInputRow.call(this, fieldName, fieldData);
		}, this);

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

		this.$el.find('.form-row-input-container select,.form-row-input-container input').each(function(i,el){
			$(el).trigger('change');
		})

		// Don't give this back
		delete this.event_data['assignees-selector'];
		// YOLO
		delete this.event_data.undefined;

		return this.event_data;

	},

	stopPropagation: function(e){
		e.stopPropagation();

		return this;
	}

});