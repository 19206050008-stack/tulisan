-- ============================================================
-- Migration: Add English translations to site_config
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Option chosen: Add _en suffixed keys (no schema change needed)
-- This is simpler than adding a new column and works with existing REST API

INSERT INTO site_config (key, value) VALUES
-- Site Identity (English)
('site_name_en', 'Di.tulis'),
('site_description_en', 'A platform where stories come alive'),
('site_tagline_en', 'Read & Write Stories'),

-- About Page (English)
('page_about_en', '{
  "title": "About Di.tulis",
  "subtitle": "A platform where stories come alive and every voice finds its audience.",
  "story": "Di.tulis was born from a simple idea: great stories can come from anywhere. We built a platform that erases the barriers between writers and readers, making it easy to discover, share, and celebrate storytelling in all its forms.\n\nWhether you are a budding author sharing your first chapter or a devoted reader searching for your next favorite series, Di.tulis is your home.",
  "mission": "To democratize storytelling by giving every writer a platform to share their stories with millions of readers worldwide.",
  "values": "Creativity, inclusivity, and empowerment. We believe everyone has a story inside them waiting to be told.",
  "reach": "Stories in 50+ languages, read by people in over 190 countries. Every culture has a story worth telling.",
  "community": "Millions of writers and readers connect every day, sharing feedback, inspiration, and building lasting creative relationships."
}'::jsonb),

-- Careers Page (English)
('page_careers_en', '{
  "title": "Careers at Di.tulis",
  "subtitle": "Join our team and help shape the future of storytelling.",
  "note": "There are currently no open positions available. Please check back later or send your CV to careers@ditulis.app to be considered in the future.",
  "openings": []
}'::jsonb),

-- Press Page (English)
('page_press_en', '{
  "title": "Press",
  "subtitle": "News, updates, and media resources from Di.tulis.",
  "releases": [
    {"date": "June 2026", "title": "Di.tulis officially launches with 460+ Indonesian short stories"},
    {"date": "June 2026", "title": "Collaboration with author AAR Nugroho for premiere content"}
  ],
  "media_email": "press@ditulis.app",
  "media_kit_note": "Contact us to get logos, brand guidelines, and product screenshots."
}'::jsonb),

-- Community Page (English)
('page_community_en', '{
  "title": "Community",
  "subtitle": "Connect with readers and writers from around the world.",
  "guidelines": [
    "Respect fellow community members",
    "Provide constructive and meaningful feedback",
    "No spam, hate speech, or NSFW content allowed",
    "Report content that violates the rules",
    "Support new writers by reading and commenting"
  ],
  "featured_topics": [
    {"title": "Tips for Writing a Compelling First Chapter", "category": "Writing Tips"},
    {"title": "Monthly Writing Challenge: June Edition", "category": "Challenge"},
    {"title": "How to Overcome Writer''s Block?", "category": "Discussion"},
    {"title": "Recommended Romance Short Stories", "category": "Recommendations"}
  ]
}'::jsonb),

-- Terms Page (English)
('page_terms_en', '{
  "title": "Terms of Service",
  "updated": "June 2026",
  "sections": [
    {"heading": "1. Acceptance of Terms", "content": "By accessing or using Di.tulis, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform."},
    {"heading": "2. User Accounts", "content": "You must be at least 13 years old to create an account. You are responsible for the security of your account and all activities that occur under it."},
    {"heading": "3. Content Ownership", "content": "You retain ownership of all content you post on Di.tulis. By publishing content, you grant us a non-exclusive license to display, distribute, and promote your work on our platform."},
    {"heading": "4. Prohibited Content", "content": "You may not post content that is illegal, harmful, threatening, abusive, harassing, defamatory, or inappropriate. We reserve the right to remove content that violates these terms."},
    {"heading": "5. Termination", "content": "We may suspend or terminate your account at any time for violations of these terms. You may also delete your account at any time through your account settings."}
  ]
}'::jsonb),

-- Privacy Page (English)
('page_privacy_en', '{
  "title": "Privacy Policy",
  "updated": "June 2026",
  "sections": [
    {"heading": "Information We Collect", "content": "We collect information you provide directly, such as your name, email address, and content you publish. We also collect usage data including pages visited, reading history, and interaction patterns."},
    {"heading": "How We Use Information", "content": "We use your information to provide and improve our services, personalize your reading experience, send notifications you opt into, and ensure platform security."},
    {"heading": "Data Sharing", "content": "We do not sell your personal information. We may share data with service providers who help us operate the platform, and when required by law."},
    {"heading": "Your Rights", "content": "You have the right to access, correct, or delete your personal data. You can manage your privacy settings from your account dashboard or contact us for assistance."},
    {"heading": "Cookies", "content": "We use cookies and similar technologies to remember your preferences, analyze traffic, and improve your experience. You can manage cookie preferences in your browser settings."}
  ]
}'::jsonb),

-- Accessibility Page (English)
('page_accessibility_en', '{
  "title": "Accessibility",
  "updated": "June 2026",
  "sections": [
    {"heading": "Our Commitment", "content": "Di.tulis is committed to ensuring digital accessibility for people with disabilities. We continuously improve the user experience for everyone and apply relevant accessibility standards."},
    {"heading": "Standards", "content": "We strive to meet Web Content Accessibility Guidelines (WCAG) 2.1 Level AA. These guidelines describe how to make web content more accessible to people with disabilities."},
    {"heading": "Features", "content": "Keyboard navigation support across the platform, screen reader compatible content, high contrast mode and dark theme, adjustable font sizes in the reader interface, and alt text for images and media content."},
    {"heading": "Feedback", "content": "If you encounter accessibility barriers on Di.tulis, please contact us at accessibility@ditulis.app. We welcome your feedback and will work to address any issues."}
  ]
}'::jsonb),

-- Help Page (English)
('page_help_en', '{
  "title": "Help Center",
  "subtitle": "Find answers to common questions or contact us.",
  "support_email": "support@ditulis.app",
  "faq": [
    {"q": "How do I create an account?", "a": "Click the user icon in the navbar and select \"Sign Up\". Fill in your details and you''re ready to start reading and writing."},
    {"q": "How do I publish a story?", "a": "Go to the Write page, write your story, select a category, and click \"Publish\". You can also save drafts and publish later."},
    {"q": "Can I edit a story after publishing?", "a": "Yes, you can edit published stories at any time from the My Stories page."},
    {"q": "How do I report inappropriate content?", "a": "Use the \"Report\" button available on every story page. Our moderation team reviews all reports within 24 hours."},
    {"q": "How do I delete my account?", "a": "Go to Settings > Account > Delete Account. Note that this action is permanent and cannot be undone."},
    {"q": "Is Di.tulis free?", "a": "Yes, Di.tulis is free for both readers and writers."}
  ]
}'::jsonb)

ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
