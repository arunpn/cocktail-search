import json
from functools import partial
from collections import OrderedDict

from scrapy.spider import BaseSpider
from scrapy.http import Request
from scrapy.selector import HtmlXPathSelector

from lxml.cssselect import css_to_xpath

from cocktails.items import CocktailItem
from cocktails.utils import html_to_text

URL = 'http://www.seriouseats.com/topics/search?index=recipe&count=200&term=c|cocktails'

xp_ingredients = css_to_xpath('.ingredient')

class SeriouseatsSpider(BaseSpider):
	name = 'seriouseats'
	start_urls = [URL]

	def parse(self, response):
		recipes = json.loads(response.body)['entries']

		for recipe in recipes:
			picture = None

			for size in sorted(int(k[10:]) for k in recipe if k.startswith('thumbnail_')):
				picture = recipe['thumbnail_%d' % size]

				if picture:
					if 'strainerprimary' not in picture and 'cocktailChroniclesBug' not in picture:
						break

					picture = None
				
			yield Request(recipe['permalink'], partial(
				self.parse_recipe,
				title=recipe['title'].split(':')[-1].strip(),
				picture=picture
			))

		if recipes:
			yield Request('%s&before=%s' % (URL, recipe['id']), self.parse)

	def parse_recipe(self, response, title, picture):
		hxs = HtmlXPathSelector(response)

		section = None
		sections = OrderedDict()

		for node in hxs.select(xp_ingredients):
			text = html_to_text(node.extract()).strip()

			if not text:
				continue

			if node.select('strong'):
				section = text
				continue

			sections.setdefault(section, []).append(text)

		ingredients = sections.pop(None, None) or sections.pop(sections.keys()[-1])
		extra_ingredients = [x for y in sections.values() for x in y]

		yield CocktailItem(
			title=title,
			picture=picture,
			url=response.url,
			ingredients=ingredients,
			extra_ingredients=extra_ingredients
		)
