(function(App) {
    'use strict';

    var prevX = 0;
    var prevY = 0;

    var resizeImage = App.Providers.Trakttv.resizeImage;

    var FavoriteItem = Backbone.Marionette.ItemView.extend({
        template: '#favorite-item-tpl',

        tagName: 'li',
        className: 'bookmark-item',

        ui: {
            coverImage: '.cover-image',
            cover: '.cover',
            bookmarkIcon: '.actions-favorites',
            watchedIcon: '.actions-watched'
        },

        events: {
            'click .actions-favorites': 'toggleFavorite',
            'click .actions-watched': 'toggleWatched',
            'click .cover': 'showDetail',
            'mouseover .cover': 'hoverItem'
        },

        initialize: function() {
            this.model.set('image', resizeImage(this.model.get('image'), '300'));
        },

        onShow: function() {
            if (this.model.get('type') === 'movie') {
                var watched = App.watchedMovies.indexOf(this.model.get('imdb')) !== -1;
                this.model.set('watched', watched);

                if (watched) {
                    this.ui.watchedIcon.addClass('selected');
                    if (Settings.fadeWatchedCovers) {
                        this.$el.addClass('fadeCover');
                    }
                }
            } else {
                this.ui.watchedIcon.hide();
            }
            this.ui.bookmarkIcon.addClass('selected');
            this.ui.coverImage.on('load', _.bind(this.showCover, this));
        },

        onClose: function() {
            this.ui.coverImage.off('load');
        },

        showCover: function() {
            this.ui.cover.css('background-image', 'url(' + this.model.get('image') + ')');
            this.ui.cover.css('opacity', '1');
            this.ui.coverImage.remove();
        },

        hoverItem: function(e) {
            if (e.pageX !== prevX || e.pageY !== prevY) {
                $('.bookmark-item.selected').removeClass('selected');
                $(this.el).addClass('selected');
                prevX = e.pageX;
                prevY = e.pageY;
            }
        },

        toggleWatched: function(e) {
            e.stopPropagation();
            e.preventDefault();
            var that = this;
            if (this.model.get('watched') === true) {
                Database.markMovieAsNotWatched({
                    imdb_id: this.model.get('imdb')
                }, true, function(err, data) {
                    that.model.set('watched', false);
                    that.$el.removeClass('fadeCover');
                    that.ui.watchedIcon.removeClass('selected');
                    App.watchedMovies.splice(App.watchedMovies.indexOf(that.model.get('imdb')), 1);
                });
            } else {

                Database.markMovieAsWatched({
                    imdb_id: this.model.get('imdb'),
                    from_browser: true
                }, true, function(err, data) {
                    that.model.set('watched', true);
                    that.$el.addClass('fadeCover');
                    that.ui.watchedIcon.addClass('selected');
                    App.watchedMovies.push(that.model.get('imdb'));
                });

            }
        },

        showDetail: function(e) {
            e.preventDefault();

            if (this.model.get('type') === 'movie') {

                var SelectedMovie = new Backbone.Model({
                    imdb: this.model.get('imdb'),
                    image: this.model.get('image'),
                    torrents: this.model.get('torrents'),
                    title: this.model.get('title'),
                    genre: this.model.get('genre'),
                    synopsis: this.model.get('synopsis'),
                    runtime: this.model.get('runtime'),
                    year: this.model.get('year'),
                    health: this.model.get('health'),
                    subtitle: this.model.get('subtitle'),
                    backdrop: this.model.get('backdrop'),
                    rating: this.model.get('rating'),
                    trailer: this.model.get('trailer'),
                    provider: this.model.get('provider'),
                    bookmarked: true,
                });

                App.vent.trigger('movie:showDetail', SelectedMovie);

            } else {

                // live call to api to get latest detail !
                $('.spinner').show();
                var provider = this.model.get('provider'); //XXX(xaiki): provider hack
                var tvshow = App.Config.getProvider('tvshow')[provider];
                var data = tvshow.detail(this.model.get('imdb_id'), function(err, data) {
                    $('.spinner').hide();
                    if (!err) {
                        App.vent.trigger('show:showDetail', new Backbone.Model(data));
                    } else {
                        alert('Somethings wrong... try later');
                    }
                });

            }

        },

        toggleFavorite: function(e) {
            e.stopPropagation();
            e.preventDefault();
            var that = this;

            Database.deleteBookmark(this.model.get('imdb'), function(err, data) {
                App.userBookmarks.splice(App.userBookmarks.indexOf(that.model.get('imdb')), 1);
                win.info('Bookmark deleted (' + that.model.get('imdb') + ')');
                if (that.model.get('type') === 'movie') {
                    // we'll make sure we dont have a cached movie
                    Database.deleteMovie(that.model.get('imdb'), function(err, data) {});
                }

                // we'll delete this element from our list view
                $(e.currentTarget).closest('li').animate({
                    paddingLeft: '0px',
                    paddingRight: '0px',
                    width: '0%',
                    opacity: 0
                }, 500, function() {
                    $(this).remove();
                    $('.bookmarks').append($('<li/>').addClass('bookmark-item ghost'));
                    if ($('.bookmarks li').length === 0) {
                        App.vent.trigger('movies:list', []);
                    }
                });
            });
        }
    });

    App.View.FavoriteItem = FavoriteItem;
})(window.App);