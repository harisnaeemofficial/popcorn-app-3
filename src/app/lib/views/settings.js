(function(App) {
	'use strict';

	var Settings = Backbone.Marionette.ItemView.extend({
		template: '#settings-container-tpl',
		className: 'settings-container-contain',

		ui: {
			success_alert: '.success_alert',
			fakeTempDir: '#faketmpLocation',
			tempDir: '#tmpLocation',
			fakeExternalDir: '#fakeExternalPlayerLocation',
			externalDir: '#externalPlayerLocation'
		},

		events: {
			'click .close': 'closeSettings',
			'change select,input': 'saveSetting',
			'click .flush-bookmarks': 'flushBookmarks',
			'click .flush-databases': 'flushAllDatabase',
			'click .flush-subtitles': 'flushAllSubtitles',
			'click #faketmpLocation' : 'showCacheDirectoryDialog',
			'click #fakeExternalPlayerLocation' : 'showExternalPlayerLocationDialog',
			'click .default-settings' : 'resetSettings',
			'keyup #traktUsername': 'checkTraktLogin',
			'keyup #traktPassword': 'checkTraktLogin',
			'click #unauthTrakt': 'disconnectTrakt',
			'change #tmpLocation' : 'updateCacheDirectory',
			'change #externalPlayerLocation' : 'updateExternalPlayerLocation'
		},

		onShow: function() {
			$('.filter-bar').hide();
			$('#movie-detail').hide();
			var that = this;
			Mousetrap.bind('backspace', function(e) {
				App.vent.trigger('settings:close');
			});

			Utils.findExternalPlayers().then(function(data) {
				if(data.length === 0) {
					$('#external_player_select option:contains("Loading...")').text('No Players Found');
				}
				else { 
					$('#external_player_select option').remove();
					for(var p in data) {
						$('#external_player_select').append('<option value = '+ data[p].path.replaceAll(' ', '&nbsp;') +'>'+ data[p].name +'</option>');
					}
					$('#external_player_select').val(App.settings.externalPlayerLocation);
				}
			})
			.catch(function (error) {
				$('#external_player_select option:contains("Loading...")').text('No Players Found');
			});
		},

		onClose: function() {
			Mousetrap.bind('backspace', function(e) {
				App.vent.trigger('show:closeDetail');
				App.vent.trigger('movie:closeDetail');
			});
			$('.filter-bar').show();
			$('#movie-detail').show();
		},
		showCover: function() {},

		closeSettings: function() {
			App.vent.trigger('settings:close');
		},

		saveSetting: function(e){
			var that = this;
			var value = false;
			var data = {};

			// get active field
			var field = $(e.currentTarget);

			switch(field.attr('name')){
			case 'tvshowApiEndpoint':
				value = field.val();
				if (value.substr(-1) !== '/') {
					value += '/';
				}
				break;
			case 'subtitle_size':
			case 'subtitle_language':
			case 'movies_quality':
			case 'external_player_select':
				value = $('option:selected', field).val();
				break;
			case 'language':
				value = $('option:selected', field).val();
				i18n.setLocale(value);
				break;
			case 'moviesShowQuality':
			case 'deleteTmpOnClose':
				value = field.is(':checked');
				break;
			case 'connectionLimit':
			case 'dhtLimit':
			case 'streamPort':
			case 'externalPlayerLocation':
				value = field.val().replaceAll('\u00A0', ' ');
				break;
			case 'traktUsername':
			case 'traktPassword':
				return;
			case 'tmpLocation':
				value = path.join(field.val(), 'Popcorn-Time');
				break;
			case 'externalPlayer':
				value = field.is(':checked');
				if(value) {
					if(App.settings.os === 'mac') {
						$('#externalPlayerDropdown').show();
					}
					else {
						$('#externalPlayerInput').show();
					}
				}
				else {
					$('#externalPlayerInput').hide();
					$('#externalPlayerDropdown').hide();
				}
				break;
			default:
				win.warn('Setting not defined: '+field.attr('name'));
			}
			win.info('Setting changed: ' + field.attr('name') + ' - ' + value);

			// update active session
			App.settings[field.attr('name')] = value;

			//save to db
			App.db.writeSetting({key: field.attr('name'), value: value}, function() {
				that.ui.success_alert.show().delay(3000).fadeOut(400);
			});
		},

		checkTraktLogin: _.debounce(function(e) {
			var username = document.querySelector('#traktUsername').value;
			var password = document.querySelector('#traktPassword').value;

			if(username === '' || password === '') {
				return;
			}

			$('.invalid-cross').hide();
			$('.valid-tick').hide();
			$('.loading-spinner').show();
			// trakt.authenticate automatically saves the username and pass on success!
			App.Trakt.authenticate(username, password).then(function(valid) {
				$('.loading-spinner').hide();
				// Stop multiple requests interfering with each other
				$('.invalid-cross').hide();
				$('.valid-tick').hide();
				if(valid) {
					$('.valid-tick').show();
				} else {
					$('.invalid-cross').show();
				}
			}).catch(function(err) {
				$('.loading-spinner').hide();
				$('.invalid-cross').show();
			});
		}, 750),

		disconnectTrakt: function(e) {
			var self = this;

			App.settings['traktUsername'] = '';
			App.settings['traktPassword'] = '';
			App.Trakt.authenticated = false;

			_.defer(function() {
				App.Trakt = new App.Providers.Trakttv();
				self.render();
			});
		},

		flushBookmarks: function(e) {
			var that = this;
			var btn = $(e.currentTarget);

			if( !that.areYouSure( btn, i18n.__('Flushing bookmarks...') ) ) {
				return;
			}

			that.alertMessageWait( i18n.__('We are flushing your database') );

			Database.deleteBookmarks(function(err, setting) {

				that.alertMessageSuccess( true );

			});
		},

		resetSettings: function(e) {
			var that = this;
			var btn = $(e.currentTarget);

			if( !that.areYouSure( btn, i18n.__('Resetting...') ) ) {
				return;
			}

			that.alertMessageWait( i18n.__('We are resetting the settings') );

			Database.resetSettings(function(err, setting) {

				that.alertMessageSuccess( true );

			});
		},

		flushAllDatabase: function(e) {
			var that = this;
			var btn = $(e.currentTarget);

			if( !that.areYouSure( btn, i18n.__('Flushing...') ) ) {
				return;
			}

			that.alertMessageWait( i18n.__('We are flushing your databases') );

			Database.deleteDatabases(function(err, setting) {

				that.alertMessageSuccess( true );

			});
		},

		flushAllSubtitles : function(e) {
			var that = this;
			var btn = $(e.currentTarget);

			if( !that.areYouSure( btn, i18n.__('Flushing...') ) ) {
				return;
			}

			that.alertMessageWait( i18n.__('We are flushing your subtitle cache') );

			var cache = new App.Cache('subtitle');
			cache.flushTable(function() {

				that.alertMessageSuccess( false, btn, i18n.__('Flush subtitles cache'), i18n.__('Subtitle cache deleted') );

			});
		},

		restartApplication: function() {
			var spawn = require('child_process').spawn,
				argv = gui.App.fullArgv,
				CWD = process.cwd();

			argv.push(CWD);
			spawn(process.execPath, argv, { cwd: CWD, detached: true, stdio: [ 'ignore', 'ignore', 'ignore' ] }).unref();
			gui.App.quit();
		},

		showCacheDirectoryDialog : function() {
			var that = this;
			that.ui.tempDir.click();
		},

		updateCacheDirectory : function(e) {
			// feel free to improve/change radically!
			var that = this;
			var field = $('#tmpLocation');
			that.ui.fakeTempDir.val = field.val();
			that.render();
		},

		showExternalPlayerLocationDialog : function() {
			var that = this;
			that.ui.externalDir.click();
		},

		updateExternalPlayerLocation : function(e) {
			var that = this;
			var field = $('#externalPlayerLocation');
			that.ui.fakeExternalDir.val = field.val();
			that.render();
		},

		areYouSure : function (btn, waitDesc) {
			if(!btn.hasClass('confirm')){
				btn.addClass('confirm').css('width',btn.css('width')).text( i18n.__('Are you sure?') );
				return false;
			}
			btn.text( waitDesc ).addClass('disabled').prop('disabled',true);
			return true;
		},

		alertMessageWait : function(waitDesc) {
			var $el = $('#notification');

			$el.removeClass().addClass('red').show();
			$el.html('<h1>' + i18n.__('Please wait') + '...</h1><p>' + waitDesc + '.</p>');

			$('body').addClass('has-notification');
		},

		alertMessageSuccess : function(btnRestart, btn, btnText, successDesc) {
			var that = this;
			var $el = $('#notification');

			$el.removeClass().addClass('green');
			$el.html('<h1>' + i18n.__('Success') + '</h1>');

			if(btnRestart) {
				// Add restart button
				$el.append('<p>' + i18n.__('Please restart your application') + '.</p><span class="btn-grp"><a class="btn restart">' + i18n.__('Restart') + '</a></span>');
				$('.btn.restart').on('click', function() {
					that.restartApplication();
				});
			}else{
				// Hide notification after 2 seconds
				$el.append('<p>' + successDesc + '.</p>');
				setTimeout(function(){
					btn.text( btnText ).removeClass('confirm disabled').prop('disabled',false);
					$('body').removeClass('has-notification');
					$el.hide();
				}, 2000);
			}
		}
	});

	App.View.Settings = Settings;
})(window.App);

