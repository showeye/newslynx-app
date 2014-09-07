collections.article_detailed = {
	"instance": null,
	"Collection": Backbone.Collection.extend({
		model: models.article_detailed.Model,
		set: function() {
			// You could also set this up on the model and put the `hydrateTagsInfo` and `addTagInformation` functions on the model class
			// Which would be a little more organized since they apply to the model and not to a collection, but this is also clean since we're just correcting
			// A limitation of the json not returning full tag detail
			arguments[0] = this.addTagInformation(arguments[0]);
			// console.log(arguments[0])
			// Always remove contents before setting
			Backbone.Collection.prototype.remove.call(this, this.models );
			Backbone.Collection.prototype.set.apply(this, arguments);
			this.updateHash();
			// Whenever we set an article on this model, also add it to `collections.articles_detailed.instance`
			Backbone.Collection.prototype.add.apply(collections.articles_detailed.instance, arguments);
		},
		updateHash: function() {
			// This will just have one
			this.hash = this.pluck('id')[0];
		},
		getHash: function() {
			return this.hash; 
		},

		hydrateTagsInfo: function(dehydratedObjectList, info, tagKeys){
			dehydratedObjectList.forEach(function(dehydratedObject){
				tagKeys.forEach(function(key){
					// Add the full info on a `[key_name + '_full']` property
					// This will take take ids in `obj['impact_tags']` or `obj['subject_tags']` and map them to full objects on `key + '_full'
					if (dehydratedObject[key]){
						dehydratedObject[key + '_full'] = dehydratedObject[key].map(function(id){ 
							return _.findWhere(info[key], {id: id});
						});
					}
				});

				// Add `impact_tag_categories` and `impact_tag_levels` as their own items for filtering based on our hydrated info above
				// But only if we've hydrated based on impact tag, which we don't always do because articles don't have impact tags, only subject tags
				if (dehydratedObject.impact_tags_full){
					var impact_tag_categories = _.chain(dehydratedObject.impact_tags_full).pluck('category').uniq().value();
					var impact_tag_levels     = _.chain(dehydratedObject.impact_tags_full).pluck('level').uniq().value();
					dehydratedObject['impact_tag_categories'] = impact_tag_categories;
					dehydratedObject['impact_tag_levels'] 		= impact_tag_levels;
				}
			});
			return dehydratedObjectList;
		},


		addTagInformation: function(articleDetail){
			console.log(articleDetail)
			var info = pageData.orgInfo;
			// Hydrate subject tags
			article_details   = this.hydrateTagsInfo([articleDetail], info, ['subject_tags']);

			// Hydrate each event
			articleDetail.events   = this.hydrateTagsInfo(articleDetail.events, info, ['impact_tags']);
			// Add the impact category and level info on the parent for all of the events
			var impact_tags_full      = _.chain(articleDetail.events).pluck('impact_tags_full').flatten().uniq().value();
			// Hydrate these categories and levels with full data
			var impact_tag_categories = _.chain(articleDetail.events).pluck('impact_tag_categories').flatten().uniq().map(function(category){ return _.findWhere(info.impact_tag_categories, {name: category}) }).value();
			var impact_tag_levels     = _.chain(articleDetail.events).pluck('impact_tag_levels').flatten().uniq().map(function(level){ return _.findWhere(info.impact_tag_levels, {name: level}) }).value();
			articleDetail['impact_tags_full'] 		 = impact_tags_full;
			articleDetail['impact_tag_categories'] = impact_tag_categories;
			articleDetail['impact_tag_levels'] 		 = impact_tag_levels;
			return articleDetail;
		}


	})
}