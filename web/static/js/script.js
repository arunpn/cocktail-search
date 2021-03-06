$(function() {
	var is_touch_device = 'ontouchstart' in document.documentElement;

	var cocktails = $('#cocktails');
	var form = $('form');
	var viewport = $(window);

	var initial_field = $('input', form).val('');;
	var empty_field = initial_field.clone();
	var original_title = document.title;

	var offset = 0;
	var can_load_more = false;

	var ingredients;
	var state;

	var load = function(callback) {
		can_load_more = false;

		jQuery.ajax('/recipes', {
			data: form.serializeArray().concat([{name: 'offset', value: offset}]),
			success: function(data) {
				var elements = $(data);
				var n = elements.filter('.cocktail').length;

				callback(elements, n);
				can_load_more = n > 1;

				$($('.cocktail').slice(-n)).each(function(idx, cocktail) {
					var items = $('.nav-pills > li', cocktail);
					var recipes = $('.recipe', cocktail);

					var focusItem = function(idx) {
						items.removeClass('active');
						$(items[idx]).addClass('active');

						recipes.hide();
						$(recipes[idx]).show();
					};

					items.each(function(idx, item) {
						if (is_touch_device) {
							$('a', item).click(function(event) {
								event.preventDefault();
								focusItem(idx);
							});
						} else {
							$(item).mouseover(function() {
								focusItem(idx);
							});
						}
					});

					focusItem(0);
				});
			}
		});
	};

	var loadInitial = function() {
		offset = 0;

		load(function(elements, n) {
			cocktails.html(elements);
			window.scrollTo(0, 0);
			offset = n;
		});
	};

	var loadMore = function() {
		load(function(elements, n) {
			cocktails.append(elements);
			offset += n;
		});
	};

	var updateTitle = function() {
		var title = original_title;

		if (ingredients.length > 0)
			title += ': ' + ingredients.join(', ');

		document.title = title;
	};

	var updateHistory = function() {
		if (state != document.location.hash) {
			history.pushState(null, null, state || '.');
			updateTitle();
		}
	};

	var prepareField = function(field) {
		field.keyup(function() {
			var has_empty = false;
			var new_state;

			ingredients = [];

			$('input', form).each(function(idx, field) {
				if (field.value != '')
					ingredients.push(field.value);
				else
					has_empty = true;
			});

			new_state  = ingredients.length > 0 ? '#' : '';
			new_state += ingredients.map(encodeURIComponent).join(';');

			if (!has_empty)
				addField();

			if (new_state != state) {
				state = new_state;
				loadInitial();
			}
		});

		field.blur(function() {
			$('input[value=]', form).slice(0, -1).remove();
			updateHistory();
		});
	};

	var addField = function () {
		var field = empty_field.clone();

		form.append(field);
		prepareField(field);

		return field;
	};

	var populateForm = function() {
		state = document.location.hash;
		ingredients = [];

		var bits = state.substring(1).split(';');

		$('input', form).remove();

		for (var i = 0; i < bits.length; i++) {
			var ingredient = decodeURIComponent(bits[i]);

			if (ingredient == '')
				continue;

			field = addField();
			field.val(ingredient);

			ingredients.push(ingredient);
		}

		addField().focus();

		updateTitle();
		loadInitial();
	};

	viewport.scroll(function() {
		if (!can_load_more)
			return;
		if (viewport.scrollTop() + viewport.height() < $('.cocktail').slice(-5)[0].offsetTop)
			return;

		loadMore();
	});

	viewport.on('mousemove', updateHistory);
	viewport.on('touchstart', updateHistory);
	viewport.on('popstate', populateForm);

	prepareField(initial_field);
	populateForm();
});
