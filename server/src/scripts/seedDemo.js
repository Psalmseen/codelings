// Adds a published "HTML Basics" demo course with one example of every exercise type.
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';

const TITLE = 'HTML Basics';

await connectDb();

if (await Course.exists({ title: TITLE })) {
  console.log(`"${TITLE}" already exists, nothing to do`);
} else {
  const course = await Course.create({
    title: TITLE,
    description: 'Build your first web page, one tag at a time.',
    emoji: '🌐',
    color: '#F97316',
    status: 'published',
    modules: [{ title: 'Your first page' }, { title: 'Text & links' }],
  });
  const [first, second] = course.modules;

  const lessons = [
    {
      moduleId: first._id,
      title: 'What is HTML?',
      videoUrl: 'https://www.youtube.com/watch?v=UB1O30fR-EE',
      reading: 'HTML describes the **structure** of a web page using *tags* like `<h1>` and `<p>`.',
      exercises: [
        {
          type: 'mcq',
          prompt: 'What does HTML stand for?',
          options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Home Tool Markup Language'],
          correctIndex: 0,
          explanation: 'HTML = HyperText Markup Language.',
        },
        {
          type: 'fill_blank',
          prompt: 'Complete the heading tag',
          text: '<___>Hello world</h1>',
          answers: ['h1'],
        },
      ],
    },
    {
      moduleId: first._id,
      title: 'Page skeleton',
      reading: 'Every page has `<html>`, `<head>` and `<body>`.',
      exercises: [
        {
          type: 'order_code',
          prompt: 'Put the page skeleton in the right order',
          lines: ['<html>', '  <head></head>', '  <body></body>', '</html>'],
        },
      ],
    },
    {
      moduleId: second._id,
      title: 'Headings & paragraphs',
      exercises: [
        {
          type: 'code_challenge',
          prompt: 'Add an <h1> that says "Hello Codelings" and a paragraph underneath it.',
          starter: { html: '<!-- write your HTML here -->\n', css: 'h1 { color: #6D4AFF; }', js: '' },
          tests: [
            { label: 'Page has an <h1> saying "Hello Codelings"', check: "document.querySelector('h1')?.textContent.trim() === 'Hello Codelings'" },
            { label: 'Page has a paragraph', check: "document.querySelector('p') !== null" },
          ],
        },
      ],
    },
    {
      moduleId: second._id,
      title: 'Links',
      exercises: [
        {
          type: 'mcq',
          prompt: 'Which attribute sets where a link goes?',
          options: ['src', 'href', 'link', 'to'],
          correctIndex: 1,
        },
      ],
    },
  ];

  const orderInModule = new Map();
  await Lesson.insertMany(
    lessons.map((lesson) => {
      const key = String(lesson.moduleId);
      const order = orderInModule.get(key) ?? 0;
      orderInModule.set(key, order + 1);
      return { ...lesson, course: course._id, order };
    })
  );
  console.log(`Created "${TITLE}" with ${lessons.length} lessons`);
}

await mongoose.disconnect();
