collections.impact_tags = {
	"instance": null,
	"Collection": Backbone.Collection.extend({
		model: models.tags.Model,
		getTrue: helpers.modelsAndCollections.getTrue
	})
}