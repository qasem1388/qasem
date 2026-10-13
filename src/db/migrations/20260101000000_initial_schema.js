'use strict';
/**
 * المخطط الأساسي لقاعدة البيانات.
 * متوافق مع SQLite و PostgreSQL (التواريخ تُخزَّن كنص YYYY-MM-DD لتجنب مشاكل المناطق الزمنية،
 * والحقول المركبة — مثل معرض الصور والمرفقات — تُخزَّن كنص JSON).
 */

function base(t) {
  t.increments('id').primary();
}
function stamps(t, knex) {
  t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
}
function ordering(t) {
  t.integer('sort_order').notNullable().defaultTo(0);
  t.boolean('is_active').notNullable().defaultTo(true);
}
function seo(t) {
  t.string('seo_title', 255);
  t.string('seo_description', 500);
  t.string('og_image', 500);
}

exports.up = async function up(knex) {
  // ===== المستخدمون والصلاحيات =====
  await knex.schema.createTable('roles', (t) => {
    base(t);
    t.string('name', 64).notNullable().unique();
    t.string('label', 128).notNullable();
    t.string('description', 500);
    t.boolean('is_system').notNullable().defaultTo(false);
    stamps(t, knex);
  });

  await knex.schema.createTable('permissions', (t) => {
    base(t);
    t.string('key', 128).notNullable().unique();
    t.string('label', 255).notNullable();
    t.string('group_name', 128);
  });

  await knex.schema.createTable('role_permissions', (t) => {
    t.integer('role_id').unsigned().notNullable().references('id').inTable('roles').onDelete('CASCADE');
    t.integer('permission_id').unsigned().notNullable().references('id').inTable('permissions').onDelete('CASCADE');
    t.primary(['role_id', 'permission_id']);
  });

  await knex.schema.createTable('users', (t) => {
    base(t);
    t.string('name', 128).notNullable();
    t.string('email', 255).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.integer('role_id').unsigned().references('id').inTable('roles').onDelete('SET NULL');
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamp('last_login_at');
    t.integer('failed_logins').notNullable().defaultTo(0);
    t.timestamp('locked_until');
    stamps(t, knex);
  });

  await knex.schema.createTable('sessions', (t) => {
    t.string('sid', 255).primary();
    t.text('sess').notNullable();
    t.bigInteger('expires_at').notNullable().index();
  });

  // ===== الإعدادات =====
  await knex.schema.createTable('site_settings', (t) => {
    t.string('key', 128).primary();
    t.text('value');
    t.string('group_name', 64);
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // ===== الملفات =====
  await knex.schema.createTable('media_files', (t) => {
    base(t);
    t.string('original_name', 255).notNullable();
    t.string('file_name', 255).notNullable();
    t.string('url', 500).notNullable();
    t.string('mime_type', 128).notNullable();
    t.string('kind', 16).notNullable(); // image | pdf
    t.integer('size').notNullable();
    t.string('alt', 255);
    t.integer('uploaded_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    stamps(t, knex);
  });

  // ===== الصفحة الرئيسية =====
  await knex.schema.createTable('homepage_slides', (t) => {
    base(t);
    t.string('title', 255).notNullable();
    t.string('description', 500);
    t.string('image', 500);
    t.string('button_text', 100);
    t.string('button_url', 500);
    t.boolean('open_new_tab').notNullable().defaultTo(false);
    ordering(t);
    stamps(t, knex);
  });

  await knex.schema.createTable('mission_vision_values', (t) => {
    base(t);
    t.string('kind', 32).notNullable(); // mission | vision | values | other
    t.string('title', 255).notNullable();
    t.text('content');
    t.string('icon', 100);
    ordering(t);
    stamps(t, knex);
  });

  await knex.schema.createTable('statistics', (t) => {
    base(t);
    t.string('scope', 32).notNullable().defaultTo('home'); // home | satisfaction | needs
    t.string('label', 255).notNullable();
    t.bigInteger('value').notNullable().defaultTo(0);
    t.string('prefix', 20);
    t.string('suffix', 20);
    t.string('icon', 100);
    ordering(t);
    stamps(t, knex);
  });

  await knex.schema.createTable('services', (t) => {
    base(t);
    t.string('title', 255).notNullable();
    t.string('description', 1000);
    t.string('image', 500);
    t.string('icon', 100);
    t.string('button_text', 100);
    t.string('button_url', 500);
    ordering(t);
    stamps(t, knex);
  });

  await knex.schema.createTable('projects', (t) => {
    base(t);
    t.string('title', 255).notNullable();
    t.string('slug', 255).notNullable().unique();
    t.string('category', 128);
    t.string('summary', 1000);
    t.text('content');
    t.string('image', 500);
    t.text('gallery');
    t.string('start_date', 10);
    t.string('end_date', 10);
    t.string('beneficiaries', 255);
    t.string('status', 16).notNullable().defaultTo('draft');
    t.boolean('is_featured').notNullable().defaultTo(false);
    t.integer('sort_order').notNullable().defaultTo(0);
    seo(t);
    stamps(t, knex);
  });

  // ===== صفحات المحتوى =====
  await knex.schema.createTable('pages', (t) => {
    base(t);
    t.string('name', 255).notNullable();
    t.string('slug', 255).notNullable().unique();
    t.string('title', 255).notNullable();
    t.text('content');
    t.string('image', 500);
    t.string('status', 16).notNullable().defaultTo('draft');
    t.boolean('show_in_menu').notNullable().defaultTo(false);
    t.boolean('show_in_footer').notNullable().defaultTo(false);
    t.integer('sort_order').notNullable().defaultTo(0);
    seo(t);
    t.integer('created_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    stamps(t, knex);
  });

  await knex.schema.createTable('navigation_items', (t) => {
    base(t);
    t.string('location', 32).notNullable().defaultTo('header'); // header | footer
    t.integer('parent_id').unsigned().references('id').inTable('navigation_items').onDelete('CASCADE');
    t.string('label', 128).notNullable();
    t.string('link_type', 16).notNullable().defaultTo('url'); // url | page
    t.integer('page_id').unsigned().references('id').inTable('pages').onDelete('SET NULL');
    t.string('url', 500);
    t.boolean('open_new_tab').notNullable().defaultTo(false);
    ordering(t);
    stamps(t, knex);
  });

  await knex.schema.createTable('about_content', (t) => {
    base(t);
    t.string('section_key', 64).notNullable(); // overview | history | goals | strategic_goals | custom
    t.string('title', 255).notNullable();
    t.text('content');
    t.string('icon', 100);
    ordering(t);
    stamps(t, knex);
  });

  // ===== الحوكمة =====
  await knex.schema.createTable('governance_years', (t) => {
    base(t);
    t.integer('year').notNullable().unique();
    t.string('title', 255);
    t.string('description', 1000);
    ordering(t);
    stamps(t, knex);
  });

  await knex.schema.createTable('governance_files', (t) => {
    base(t);
    t.integer('year_id').unsigned().notNullable().references('id').inTable('governance_years').onDelete('CASCADE');
    t.string('title', 255).notNullable();
    t.string('description', 1000);
    t.string('file_date', 10);
    t.string('file_url', 500).notNullable();
    ordering(t);
    stamps(t, knex);
  });

  // ===== الأعضاء والمنسوبون =====
  await knex.schema.createTable('members', (t) => {
    base(t);
    t.string('member_group', 32).notNullable(); // general_assembly | board
    t.string('name', 255).notNullable();
    t.string('position', 255);
    t.string('photo', 500);
    t.text('bio');
    t.string('joined_at', 10);
    ordering(t);
    stamps(t, knex);
  });

  await knex.schema.createTable('employees', (t) => {
    base(t);
    t.string('name', 255).notNullable();
    t.string('position', 255);
    t.string('department', 255);
    t.string('photo', 500);
    t.text('bio');
    t.string('joined_at', 10);
    ordering(t);
    stamps(t, knex);
  });

  await knex.schema.createTable('executive_manager', (t) => {
    base(t);
    t.string('name', 255);
    t.string('job_title', 255);
    t.string('photo', 500);
    t.string('national_id', 20);
    t.boolean('show_national_id').notNullable().defaultTo(false);
    t.string('mobile', 30);
    t.boolean('show_mobile').notNullable().defaultTo(true);
    t.string('email', 255);
    t.boolean('show_email').notNullable().defaultTo(true);
    t.text('bio');
    stamps(t, knex);
  });

  await knex.schema.createTable('organizational_units', (t) => {
    base(t);
    t.integer('parent_id').unsigned().references('id').inTable('organizational_units').onDelete('CASCADE');
    t.string('unit_type', 32).notNullable().defaultTo('department'); // board | committee | management | department | section | position
    t.string('name', 255).notNullable();
    t.string('holder_name', 255);
    t.string('description', 1000);
    ordering(t);
    stamps(t, knex);
  });

  // ===== المركز الإعلامي =====
  await knex.schema.createTable('news_categories', (t) => {
    base(t);
    t.string('name', 128).notNullable();
    t.string('slug', 128).notNullable().unique();
    ordering(t);
    stamps(t, knex);
  });

  await knex.schema.createTable('news', (t) => {
    base(t);
    t.string('title', 255).notNullable();
    t.string('slug', 255).notNullable().unique();
    t.string('excerpt', 1000);
    t.text('content');
    t.string('image', 500);
    t.integer('category_id').unsigned().references('id').inTable('news_categories').onDelete('SET NULL');
    t.string('author_name', 128);
    t.string('published_at', 10);
    t.text('gallery');
    t.string('video_url', 500);
    t.text('attachments');
    t.string('status', 16).notNullable().defaultTo('draft');
    t.boolean('is_featured').notNullable().defaultTo(false);
    t.integer('views').notNullable().defaultTo(0);
    seo(t);
    t.integer('created_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    stamps(t, knex);
    t.index(['status', 'published_at']);
  });

  await knex.schema.createTable('media_videos', (t) => {
    base(t);
    t.string('title', 255).notNullable();
    t.string('youtube_url', 500).notNullable();
    t.string('youtube_id', 32).notNullable();
    t.string('description', 1000);
    t.string('thumbnail', 500);
    t.string('video_date', 10);
    ordering(t);
    stamps(t, knex);
  });

  await knex.schema.createTable('albums', (t) => {
    base(t);
    t.string('title', 255).notNullable();
    t.string('slug', 255).notNullable().unique();
    t.string('description', 1000);
    t.string('cover_image', 500);
    t.string('album_date', 10);
    ordering(t);
    stamps(t, knex);
  });

  await knex.schema.createTable('media_images', (t) => {
    base(t);
    t.integer('album_id').unsigned().notNullable().references('id').inTable('albums').onDelete('CASCADE');
    t.string('image', 500).notNullable();
    t.string('caption', 500);
    ordering(t);
    stamps(t, knex);
  });

  // ===== المستفيدون =====
  await knex.schema.createTable('beneficiary_needs', (t) => {
    base(t);
    t.string('section_type', 32).notNullable(); // intro | goals | results | reports | other
    t.string('title', 255).notNullable();
    t.text('content');
    t.text('attachments');
    ordering(t);
    stamps(t, knex);
  });

  await knex.schema.createTable('satisfaction_surveys', (t) => {
    base(t);
    t.string('section_type', 32).notNullable(); // intro | surveys | results | reports | other
    t.string('title', 255).notNullable();
    t.text('content');
    t.string('survey_url', 500);
    t.string('survey_year', 10);
    t.integer('satisfaction_rate');
    t.text('attachments');
    ordering(t);
    stamps(t, knex);
  });

  // ===== التطوع والتوظيف =====
  await knex.schema.createTable('volunteers', (t) => {
    base(t);
    t.string('full_name', 255).notNullable();
    t.string('national_id', 20).notNullable();
    t.string('mobile', 30).notNullable();
    t.string('email', 255).notNullable();
    t.string('city', 128);
    t.string('qualification', 255);
    t.string('specialization', 255);
    t.text('skills');
    t.text('experience');
    t.text('interests');
    t.string('availability', 255);
    t.text('notes');
    t.string('status', 16).notNullable().defaultTo('new'); // new | reviewed | accepted | rejected | active
    t.text('admin_notes');
    stamps(t, knex);
    t.index(['status']);
  });

  await knex.schema.createTable('job_posts', (t) => {
    base(t);
    t.string('title', 255).notNullable();
    t.string('slug', 255).notNullable().unique();
    t.string('department', 255);
    t.text('description');
    t.text('qualifications');
    t.text('experience');
    t.text('skills');
    t.string('job_type', 32); // full_time | part_time | contract | remote | internship
    t.string('location', 255);
    t.string('start_date', 10);
    t.string('end_date', 10);
    t.string('status', 16).notNullable().defaultTo('draft');
    t.integer('sort_order').notNullable().defaultTo(0);
    seo(t);
    stamps(t, knex);
  });

  await knex.schema.createTable('job_applications', (t) => {
    base(t);
    t.integer('job_id').unsigned().references('id').inTable('job_posts').onDelete('SET NULL');
    t.string('job_title', 255);
    t.string('full_name', 255).notNullable();
    t.string('mobile', 30).notNullable();
    t.string('email', 255).notNullable();
    t.string('qualification', 255);
    t.text('experience');
    t.string('cv_file', 255); // اسم الملف داخل التخزين الخاص (غير متاح للعامة)
    t.text('message');
    t.string('status', 16).notNullable().defaultTo('new'); // new | reviewed | shortlisted | rejected | hired
    t.text('admin_notes');
    stamps(t, knex);
    t.index(['status']);
  });

  await knex.schema.createTable('contact_messages', (t) => {
    base(t);
    t.string('name', 255).notNullable();
    t.string('email', 255);
    t.string('phone', 30);
    t.string('subject', 255);
    t.text('message').notNullable();
    t.string('status', 16).notNullable().defaultTo('new'); // new | read | replied | archived
    t.text('admin_notes');
    stamps(t, knex);
  });

  await knex.schema.createTable('social_links', (t) => {
    base(t);
    t.string('platform', 32).notNullable();
    t.string('label', 128);
    t.string('url', 500).notNullable();
    ordering(t);
    stamps(t, knex);
  });

  // ===== سجل العمليات =====
  await knex.schema.createTable('audit_logs', (t) => {
    base(t);
    t.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
    t.string('user_name', 255);
    t.string('action', 64).notNullable();
    t.string('entity', 64);
    t.string('entity_id', 64);
    t.text('details');
    t.string('ip', 64);
    t.string('user_agent', 500);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['created_at']);
  });
};

exports.down = async function down(knex) {
  const tables = [
    'audit_logs', 'social_links', 'contact_messages', 'job_applications', 'job_posts', 'volunteers',
    'satisfaction_surveys', 'beneficiary_needs', 'media_images', 'albums', 'media_videos', 'news',
    'news_categories', 'organizational_units', 'executive_manager', 'employees', 'members',
    'governance_files', 'governance_years', 'about_content', 'navigation_items', 'pages', 'projects',
    'services', 'statistics', 'mission_vision_values', 'homepage_slides', 'media_files', 'site_settings',
    'sessions', 'users', 'role_permissions', 'permissions', 'roles',
  ];
  for (const t of tables) await knex.schema.dropTableIfExists(t);
};

