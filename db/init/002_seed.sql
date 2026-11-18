INSERT INTO categories (name, external_id) VALUES
   ('Music', 'KZFzniwnSyZfZ7v7nJ'),
   ('Sports', 'KZFzniwnSyZfZ7v7nE'),
   ('Arts & Theatre', 'KZFzniwnSyZfZ7v7na'),
   ('Family', 'KZFzniwnSyZfZ7v7n1')
ON CONFLICT (name) DO NOTHING;

INSERT INTO venues (external_id, name, address, city, state, postal_code, location) VALUES
   ('seed-v1', 'Delta Center', '301 S Temple', 'Salt Lake City', 'UT', '84101',
      ST_SetSRID(ST_MakePoint(-111.9011, 40.7683), 4326)::geography),
   ('seed-v2', 'Eccles Theater', '131 S Main St', 'Salt Lake City', 'UT', '84111',
      ST_SetSRID(ST_MakePoint(-111.8908, 40.7660), 4326)::geography),
   ('seed-v3', 'Rice-Eccles Stadium', '451 S 1400 E', 'Salt Lake City', 'UT', '84112',
      ST_SetSRID(ST_MakePoint(-111.8489, 40.7600), 4326)::geography),
   ('seed-v4', 'Kilby Court', '741 S Kilby Ct', 'Salt Lake City', 'UT', '84101',
      ST_SetSRID(ST_MakePoint(-111.9033, 40.7505), 4326)::geography),
   ('seed-v5', 'Thanksgiving Point', '3003 N Thanksgiving Way', 'Lehi', 'UT', '84043',
      ST_SetSRID(ST_MakePoint(-111.8888, 40.4296), 4326)::geography)
ON CONFLICT (external_id) DO NOTHING;

INSERT INTO events (external_id, name, description, url, starts_at, price_min, price_max, currency, venue_id, category_id)
SELECT e.external_id, e.name, e.description, e.url, now() + e.offset_days * interval '1 day',
         e.price_min, e.price_max, 'USD',
         (SELECT id FROM venues WHERE external_id = e.venue),
         (SELECT id FROM categories WHERE name = e.category)
FROM (VALUES
   ('seed-e1', 'Utah Jazz vs. Denver Nuggets', 'NBA regular season basketball game.', NULL, 3, 35.00, 250.00, 'seed-v1', 'Sports'),
   ('seed-e2', 'Indie Rock Night', 'Three local indie rock bands in an intimate all-ages venue.', NULL, 5, 15.00, 15.00, 'seed-v4', 'Music'),
   ('seed-e3', 'Hamilton', 'The award-winning musical about Alexander Hamilton.', NULL, 10, 89.00, 349.00, 'seed-v2', 'Arts & Theatre'),
   ('seed-e4', 'Utes Football Home Game', 'University of Utah college football.', NULL, 7, 40.00, 180.00, 'seed-v3', 'Sports'),
   ('seed-e5', 'Dinosaur Museum Family Day', 'Hands-on dinosaur exhibits and activities for kids.', NULL, 2, 0.00, 25.00, 'seed-v5', 'Family'),
   ('seed-e6', 'Symphony Pops Concert', 'An evening of movie music performed live.', NULL, 14, 30.00, 95.00, 'seed-v2', 'Music')
) AS e(external_id, name, description, url, offset_days, price_min, price_max, venue, category)
ON CONFLICT (external_id) DO NOTHING;
