app.Articles = Backbone.View.extend({

	el: '#main-wrapper',

	events: {
		'click .add-to-comparison': 'addToComparison',
		'click .option-title .show-hide': 'showHideList',
		'change .toggle-all': 'toggleAllDrawer',
		'click #alter-comparison-marker': 'updateComparisonMarker',
		'click .load-more': 'moreSummaryArticles',
		'click .go-to-detail': 'goToDetail',
		'click .modal-toggle': 'toggleModal',
		'click .modal-close': 'toggleModal'
	},

	initialize: function(){
		// Keep track of views rendered by this view
		this._subviews = [];

		// Cache these selectors
		this.$subjectTagList = $('.option-container[data-type="subject-tags"] .tag-list');
		this.$impactTagCategoriesList = $('.option-container[data-type="impact-tag-categories"] .tag-list');
		this.$impactTagLevelsList = $('.option-container[data-type="impact-tag-levels"] .tag-list');
		this.$impactTagList = $('.option-container[data-type="impact-tags"] .tag-list');
		this.$articleList = $('#article-list');
		this.$drawer = $('#drawer');
		this.$content = $('#content');
		this.$divisionSwitcher = $('.division-switcher');
		this.$drawerPointersCntnr = $('#drawer-pointers-container');
		this.$articleTitleSearcher = $('#article-title-searcher');
		this.$dateRangeSearcher = $('#date-range-searcher');
		this.$articleDrawerSorter = $('#article-drawer-sorter');
		this.$addArticle = $('#add-article');


		this.isotopeCntnr = '.rows';
		this.isotopeChild = '.article-detail-row-wrapper';


		// Update hash and active collection on mode change
		this.listenTo(models.section_mode, 'change:mode', this.sectionMode.update);

		// Listen to changes in the PourOver collection query modificaition and `set` `collections.article_summaries_instance` to the results of the associated view
		// Firing add and remove events on those models
		views.po.article_summaries.on('update', this.drawer.setActiveArticleSummaries);
		// // Listen for paging on the view, will will add items to the drawer, not `set` them
		views.po.article_summaries.on('addToDrawer', this.drawer.addActiveArticleSummaries);

		// Listen for adds and removes to the article summaries collection
		// And populate the drawer on `add` and `remove`
		// this.listenTo(collections.article_summaries.instance, 'change', this.updateToggle);
		this.listenTo(collections.article_summaries.instance, 'add', this.drawer.add);
		this.listenTo(collections.article_summaries.instance, 'remove', this.drawer.remove);


		// As you move things in and out of the comparison view
		// Listen to its collection and `add` and `remove things accordingly
		this.listenTo(collections.article_comparisons.instance, 'add', this.comparison.add);
		this.listenTo(collections.article_comparisons.instance, 'remove', this.comparison.remove);

		// When an item is added or removed from the detail collection, add or remove it
		// The remove is somewhat unnecessary since `this.$content`'s html is emptied. But it's consistent with our other code.
		this.listenTo(collections.article_detailed.instance, 'add', this.detail.add);
		this.listenTo(collections.article_detailed.instance, 'remove', this.detail.remove);


		// Create views for every one of the models in the collection and add them to the page
		this.render();

		// Listen to scroll so you can sticky the filter
		var that = this;
		this.$content.on('scroll', function(){
			var $content = $(this);
			that.onScrollTick.call(that, $content);
		})
	},

	render: function(){

		this.$drawerPointersCntnr.append(templates.drawerPointers);

		/* Drawer tag */
		// Article tags
		if (collections.subject_tags.instance.length){
			this.$subjectTagList.html('');
			collections.subject_tags.instance.each(function(tag){
				var tag_view = new views.Tag({ model: tag });
				this.$subjectTagList.append(tag_view.render().el);
			}, this);
		}

		// Impact tag categories
		if (collections.impact_tag_attributes.categories_instance.length){
			this.$impactTagCategoriesList.html('');
			collections.impact_tag_attributes.categories_instance.each(function(tag){
				var tag_view = new views.Tag({ model: tag });
				this.$impactTagCategoriesList.append(tag_view.render().el);
			}, this);
		}

		// Impact tag levels
		if (collections.impact_tag_attributes.levels_instance.length){
			this.$impactTagLevelsList.html('');
			collections.impact_tag_attributes.levels_instance.each(function(tag){
				var tag_view = new views.Tag({ model: tag });
				this.$impactTagLevelsList.append(tag_view.render().el);
			}, this);
		}

		// Impact tags
		if (collections.impact_tags.instance.length){
			this.$impactTagList.html('');
			collections.impact_tags.instance.each(function(tag){
				var tag_view = new views.Tag({ model: tag });
				this.$impactTagList.append(tag_view.render().el);
			}, this);
		}

		/* Article Summaries in the drawer */
		collections.article_summaries.instance.each(function(article){
			var article_view = new views.ArticleSummaryDrawer({model: article});
			this.$articleList.append(article_view.render().el);
		}, this);

		// If you have subject tags, render them as options in the article comparison dropdowns
		pageData.subject_tags.forEach(function(subjectTag){
			var $option =  $('<option></option>').val(subjectTag.id).html(subjectTag.name)
			$option.appendTo('.alter-comparison-marker[data-which="group"]');
		});

		// These views are okay to stick around because they are only created once and then the page is refreshed, which clears them
		new views.DivisionSwitcher({ model: models.section_mode, el: this.$divisionSwitcher });

		new views.ArticleTitleSearcher({el: this.$articleTitleSearcher});

		new views.DateRangeSearcher({el: this.$dateRangeSearcher});

		new views.ArticleDrawerSorter({el: this.$articleDrawerSorter});

		this.bakeArticleAdder();

		return this;
	},
	sectionMode: {
		update: function(model, mode){
			mode = mode || model.get('mode');
			// Kill all subviews
			this.killAllSubviews();
			// TODO, I feel this should come after the following loop
			this.sectionMode[mode].call(this);

			// If we had some models already in a collection, we'll want to adjust their selection state
			collections.article_summaries.instance.each(function(articleSummary){
				var section_selection_key = 'selected_for_' + mode,
						selected_for_section = articleSummary.get(section_selection_key) || false; // Coerce `undefined` to `false`

				var id = articleSummary.id,
						po_model = _.findWhere(collections.po.article_summaries.items, {id: id});

				// perist if not already persisted. This comes into play when selecting something from compare list that is set already to true
				// It won't trigger a change in active_selected because it is already true
				po_model[section_selection_key] = selected_for_section;

				articleSummary.set('active_selected', selected_for_section);
			});

			return this;
		},
		compare: function(){

			var article_grid =  new views.ArticleComparisonGrid;
			// Keep track of this view
			this._subviews.push(article_grid);

			// Change the detail view to default to life... maybe? 
			// collections.article_detailed.instance.metadata('selected-tab', 'life');

			this.$content.html( article_grid.render().el );
			this.$listContainer = $('#compare-grid .rows');
			// Init isotope on the `$listContainer`
			app.helpers.isotope.initCntnr.call(this);
			// And enable the toggle all and add to comparison buttons
			this.$drawer.find('.drawer-item-group[data-which="comparison-additions"] input,.drawer-item[data-type="action-item"] button').prop('disabled', false).parent().removeClass('disabled');

			// Get the parameters by which we're sorting the comparisons
			var sort_by = collections.article_comparisons.instance.metadata('sort_by'),
					sort_ascending = collections.article_comparisons.instance.metadata('sort_ascending');
			$('.header-el').attr('data-sort-ascending', sort_ascending);

			// Set the compare view to the default set of models
			// On load this will be json, but if we're coming from the detail view, we'll already have things so let's load those
			var compare_models = collections.article_comparisons.instance.models;

			// If we don't have any already in our comparison, then grab what's selected in the drawer
			// Note, this condition will most likely be on load so the `selected_for_compare: true` is a bit meaningless
			// Since many of those models load with `selected_for_compare: true`
			// But it could also trigger if you just deleted everything from the compare grid
			// In that case, grabbing just the selected ones is a better choice since it seems closer so the user's intention
			// But also it avoids loading a TON of models accidentally.
			if (!compare_models.length){
				// If we don't have anything incoming in the hash, then grab what's in the drawer as we discussed before
				// TODO, also look in the hash if we're coming from a permalink
				compare_models = collections.article_summaries.instance.where({selected_for_compare: true, in_drawer: true});

				// Make sure these models get sorted in the proper way that our collection is sorted
				// You would think that adding them to our sorted collection would take care of this
				// but the sort doesn't change the order in which add events are fired, which is how we're adding things
				// Perhaps isotope layout could be called again to take care of that... For now, this works and it keeps our data sorted and clean
				if (sort_by){
					compare_models = _.sortBy(compare_models, function(compare_model){ return compare_model.get(sort_by) });
					if (sort_ascending === false) {
						compare_models.reverse();
					}
				}
			}

			collections.article_comparisons.instance.reset();
			collections.article_comparisons.instance.set(compare_models);
			this.saveHash();

			return this;
		},
		detail: function(){
			// TODO, put a loading gif in here
			// Kill the toggle all button and add to replace buttons
			this.$drawer.find('.drawer-item-group[data-which="comparison-additions"] input,.drawer-item[data-type="action-item"] button').prop('disabled', true).parent().addClass('disabled');

			// Figure out which model we are loading and add it to collections.article_detailed.instance
			this.detail.loadModel.call(this, this.staged_article_detail, this.detail.loadPage)
			return this;
		}
	},

	toggleAllDrawer: function(e){
		var checked = $(e.currentTarget).find('input').prop('checked'),
				mode = models.section_mode.get('mode'),
				selected_for = 'selected_for_' + mode;

		collections.article_summaries.instance.each(function(summaryModel){
			// Persist and set mode
			if (mode == 'compare') {
				summaryModel.set(selected_for, checked);
			}
			summaryModel.set('active_selected', checked);
		});
		return this;
	},

	drawer: {
		setActiveArticleSummaries: function(){
			var current_filtered_set = views.po.article_summaries.getCurrentItems();
			// To maintain the correct sort order on the dom, we want to empty it
			collections.article_summaries.instance.set([]);
			// For changing the drawer list items based on filters
			collections.article_summaries.instance.set(current_filtered_set);
			app.instance.setLoadMoreButton.call(app.instance);

			// Make the checkboxes shift-selectable
			app.instance.$drawer.find('.drawer-list-outer').shiftSelectable();

			return this;

		},
		addActiveArticleSummaries: function(){
			var current_filtered_set = views.po.article_summaries.getCurrentItems();
			// For changing the drawer list items based on filters
			collections.article_summaries.instance.add(current_filtered_set);
			app.instance.setLoadMoreButton.call(app.instance);

			return this;
		},
		add: function(summaryModel){
			// Actions to take when adding an item to the drawer
			var item_view,
				item_el;

			item_view = new views.ArticleSummaryDrawer({model: summaryModel});
			item_el = item_view.render().el;
			this.$articleList.append(item_el);

			return this;
		},
		remove: function(summaryModel){
			// Actions to take when removing an item from the drawer
			summaryModel.set('in_drawer', false);
			return this;
		}

	},
	addToComparison: function(e){
		var $btn = $(e.currentTarget),
				action = $btn.attr('data-action'),
				sort_by,
				sort_ascending;

		// Only add items that are both selected and `in_drawer` which is `true` when it comes from a pourover filter
		var selected_models = collections.article_summaries.instance.where({selected_for_compare: true, in_drawer: true}),
				action;

		// Either replace or append
		if (action == 'replace'){
			action = 'set';
		} else if (action == 'add'){
			action = 'add';
		}

		collections.article_comparisons.instance[action](selected_models);

		// Grab our params to sort from metadata elements on our collection
		sort_by = collections.article_comparisons.instance.metadata('sort_by')
		sort_ascending = collections.article_comparisons.instance.metadata('sort_ascending')
		app.helpers.isotope.relayout(sort_by, sort_ascending);
		this.saveHash();

		return this;

	},

	comparison: {
		add: function(summaryModel) {
			// Actions to take when adding an item to the comparison grid
			var item_view,
				item_el;

			item_view = new views.ArticleSummaryRow({model: summaryModel});
			this._subviews.push(item_view);
			item_el = item_view.render().el;
			this.$listContainer.append(item_el);
			app.helpers.isotope.addItem.call(app.instance, item_el);
			return this;
		},
		remove: function(comparisonModel) {
			comparisonModel.set('destroy', 'delete');
			return this;
		}
	},

	detail: {
		add: function(detailModel) {
			// Vars for baking account subject tags
			var item_view,
					item_el;

			// Actions to take when adding an item to the detail view
			item_view = new views.ArticleDetail({model: detailModel});
			this._subviews.push(item_view);


			item_el = item_view.render().el;
			this.$content.html(item_el);
			// This is called after the view has rendered instead of as a part of it because we're doing some dynamic layout calculation
			// If we did more harcoding of that then we could call it before it's appended to the DOM, but this way gives us more layout flexibility
			item_view.bakeInteractiveBits();

			return this;
		},
		remove: function(detailModel) {
			detailModel.set('destroy', true);
			return this;
		},
		loadPage: function(model){
			// Populate our detailed collection with our fetched model
			// This will call `this.detail.add` on it and bake it to the DOM
			collections.article_detailed.instance.set([model]);

			this.saveHash();
		},
		getDetailModelFromId: function(detail_model_id, cb){
			var that = this,
					fetch_options = {
						data: { 
							sparse: true,
							// counts: true
						},
						processData: true,
						success: function(collection, response, options){
							cb.call(that, response);
						},
						error: function(model, err){
							console.log('Error fetching article detail' + detail_model_id, err);
						}
					},
					detail_model;

			detail_model = collections.articles_detailed.instance.findWhere({id: detail_model_id});

			// If that didn't get anything, then we're fetching, so set the fetch options
			if (!detail_model){
				detail_model = new models.article_detailed.Model({id: detail_model_id});
				detail_model.fetch(fetch_options);
			} else {
				// Reset this so we can destroy it later
				detail_model.set('destroy', false, {silent: true});
				cb.call(this, detail_model);
			}

		},
		loadModel: function(detail_model_id, cb){

			// If we don't have a detailed model id, load the first thing in the drawer view
			// We get here if we are just switching to detail view and we haven't selected anything
			if (!detail_model_id) {
				detail_model_id = collections.article_summaries.instance.where({in_drawer: true})[0].get('id');
			}

			// If that didn't work, get the first thing in the comparison
			if (!detail_model_id) {
				detail_model_id = collections.article_comparisons.instance.first().get('id');
			}

			// If that didn't work, don't do anything
			if (detail_model_id) {
				this.detail.getDetailModelFromId.call(this, detail_model_id, cb);
				// Set the drawer to active
				// This won't be active if we're navigating from the compare row or from the detail page using the next buttons
				// It does mean there's one extra loop when we click from a thing but I'm not sure how we get around that without setting some elaborate flag
				// Because currently the page switcher is agnostic as to which method calls it and two out of the three require a drawer update
				// You could cache the article summaries where `{in_drawer: true}` but meh
				var summary_model = collections.article_summaries.instance.findWhere({id: detail_model_id});
				// We won't have a summary model if we're navigating here from a url
				// Maybe later we could have that be added to the drawer but then it won't be in the filtered set and that seems ridiculous
				if (summary_model) {
					summary_model.set('selected_for_detail', true);
				}
			}

		}
	},

	saveHash: function(){
		var mode = models.section_mode.get('mode'),
				mode_collections = {
					compare: 'article_comparisons',
					detail: 'article_detailed'
				},
				mode_collection = mode_collections[mode];

		var article_ids = collections[mode_collection].instance.getHash();
		routing.router.navigate(mode + '/' + article_ids);
	},

	showHideList: function(e){
		var $btn = $(e.currentTarget),
				open = $btn.attr('data-open') == 'true',
				$list = $btn.parents('.option-container').find('.tag-list'),
				slide_duration = 400,
				text;

		if (open) {
			$list.slideUp(slide_duration, 'easeOutQuint');
			text = 'Show';
		} else {
			$list.slideDown(slide_duration, 'easeOutQuint');
			text = 'Hide';
		}

		$btn.attr('data-open', !open).html(text);

	},

	moreSummaryArticles: function(){
		var current_page_size = views.po.article_summaries.page_size;
		views.po.article_summaries.page_size = current_page_size + views.po.page_size_increment;
		views.po.article_summaries.trigger('addToDrawer');

		return this;
	},

	clearLoadMoreButton: function(){
		this.$drawer.find('.load-more').remove();
	},

	setLoadMoreButton: function(){
		var po = views.po.article_summaries,
				total_length = po.all_cids.length,
				match_set_length = po.match_set.cids.length,
				page_size = po.page_size,
				$articleCount = this.$drawer.find('.item-text[data-which="article-count"]');

		// Always kill the button
		this.clearLoadMoreButton();

		// If this value is postive, we have some things to display
		var diff = match_set_length - page_size,
				$loadMore = $('<button class="load-more"></button>'),
				load_more_str = 'Load ' + views.po.page_size_increment + ' more...',
 				article_count_str;

		if (diff > 0) {
			article_count_str = 'Showing ' + page_size + ' of ' + match_set_length + ' articles.';
			$loadMore.html(load_more_str).appendTo(this.$articleList);
		} else if (page_size >= total_length){
			article_count_str = 'Loaded all ' + total_length +  ' articles.';
		} else {
			article_count_str = 'Showing ' + match_set_length +  ' matching articles.';
		}

		$articleCount.html(article_count_str);


		// if (diff > 0) {
		// 	$articleCount.html('Showing ' + page_size + ' of ' + match_set_length + ' articles.').parent().removeClass('disabled').prop('disabled', false);
		// } else if (page_size >= total_length){
		// 	$articleCount.html('Loaded all ' + total_length +  ' articles.').parent().addClass('disabled').prop('disabled', true);
		// } else {
		// 	$articleCount.html('Showing ' + match_set_length +  ' matching articles.').parent().addClass('disabled').prop('disabled', true);
		// }

		return this;
	},

	updateComparisonMarker: function(e){
		var dimension = $('.alter-comparison-marker[data-which="dimension"]').val(),
				group     = $('.alter-comparison-marker[data-which="group"]').val();
		
		collections.article_comparisons.instance.metadata('comparison-marker-dimension', dimension);
		collections.article_comparisons.instance.metadata('comparison-marker-group', group);
		collections.article_comparisons.instance.redrawMarkers();

		return this;
	},

	onScrollTick: function($content){
		var that = this,
				stuck,
				buffer = 5,
				sticky_original_offset;
		// Vars to detect if at bottom
		var content_scrollHeight = $content[0].scrollHeight,
				content_scrollTop = $content.scrollTop();

		var $sticky = this.$el.find('.sticky');

		if ($sticky.length){
			sticky_original_offset = +$sticky.attr('data-offset');

			if (content_scrollTop >= sticky_original_offset - buffer) {
				stuck = true;
			} else {
				stuck = false;
			}
			$sticky.toggleClass('stuck', stuck);
		}
	},

	goToDetail: function(e){
		var article_id = $(e.currentTarget).attr('data-id');
		
		// Make our target id what we clicked on 
		this.staged_article_detail = +article_id;
		var current_mode = models.section_mode.get('mode');

		// If we aren't in detail mode, setting it will be enough to bring about a page change
		if (current_mode != 'detail') {
			models.section_mode.set('mode', 'detail');
		// Otherwise if we are in detail mode, then skip the prep part and load this model
		} else {
			this.sectionMode.detail.call(this);
		}
		return this;
	},

	bakeArticleAdder: function(){
		var defaults = {};

		// Create an instance of an event creator view
		var add_article_view = new views.AddArticle({defaults: defaults, el: this.$addArticle[0]});
		// this._subviews.push(add_article_view);
		this._time_picker = add_article_view.time_picker;
		return this;
	},

	toggleModal: function(e){
		// Open up a modal that lets you assign it to something
		views.helpers.toggleModal(e);
	},


});