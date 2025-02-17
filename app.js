#!/usr/bin/env node
/**
 * cliClassroomMenu.js
 * 
 * 이 스크립트는 Google Classroom API를 통해 사용자의 데이터를 가져오고,
 * inquirer를 사용하여 인터랙티브한 메뉴를 제공하며,
 * Fuse.js를 이용해 코스, 과제, 공지사항을 검색할 수 있는 CLI 도구입니다.
 */

import fs from 'fs';
import http from 'http';
import { URL } from 'url';
import readline from 'readline';
import inquirer from 'inquirer';
import { google } from 'googleapis';
import Fuse from 'fuse.js';

// OAuth2에서 사용할 권한 목록
const SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me',
  'https://www.googleapis.com/auth/classroom.announcements.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.students',
];

// 토큰 및 자격 증명 파일 경로
const TOKEN_PATH = 'token.json';
const CREDENTIALS_PATH = 'credentials.json';

// credentials.json 파일 읽기
fs.readFile(CREDENTIALS_PATH, (err, content) => {
  if (err) {
    console.error('Error loading credentials:', err);
    return;
  }
  // 인증 후 mainMenu를 호출합니다.
  authorize(JSON.parse(content), mainMenu);
});

/**
 * 주어진 자격 증명을 사용해 OAuth2 클라이언트를 생성합니다.
 * 저장된 토큰이 있으면 사용하고, 없으면 getNewToken()으로 새 토큰을 받아옵니다.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id } = credentials.installed;
  // redirect URI를 로컬 서버의 콜백 URL로 설정 (반드시 Google Cloud Console에 등록 필요)
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    'http://localhost:3000/callback'
  );

  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * 새로운 토큰을 얻기 위해 로컬 HTTP 서버를 통해 OAuth2 인증 코드를 수신합니다.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this URL:\n', authUrl);

  // 로컬 HTTP 서버를 시작하여 OAuth2 콜백을 처리
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/callback')) {
      const qs = new URL(req.url, 'http://localhost:3000').searchParams;
      const code = qs.get('code');
      console.log(`Received code: ${code}`);
      res.end('Authentication successful! You can close this window.');
      server.close();
      oAuth2Client.getToken(code, (err, token) => {
        if (err) {
          console.error('Error retrieving access token', err);
          return;
        }
        oAuth2Client.setCredentials(token);
        fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
          if (err) console.error(err);
          else console.log('Token stored to', TOKEN_PATH);
        });
        callback(oAuth2Client);
      });
    }
  }).listen(3000, () => {
    console.log('Listening on http://localhost:3000/callback for OAuth2 callback...');
  });
}

/**
 * 메인 메뉴: 사용자가 수행할 작업(코스, 과제, 공지사항 검색)을 선택할 수 있습니다.
 */
function mainMenu(auth) {
  console.log("Main Menu started.");
  inquirer
    .prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Search Courses', value: 'courses' },
          { name: 'Search Assignments', value: 'assignments' },
          { name: 'Search Announcements', value: 'announcements' },
          { name: 'Exit', value: 'exit' },
        ],
      },
    ])
    .then((answers) => {
      switch (answers.action) {
        case 'courses':
          searchCourses(auth);
          break;
        case 'assignments':
          chooseCourse(auth, 'assignments');
          break;
        case 'announcements':
          chooseCourse(auth, 'announcements');
          break;
        case 'exit':
          console.log('Exiting.');
          process.exit(0);
          break;
      }
    })
    .catch((err) => {
      console.error('Menu error:', err);
    });
}

/**
 * Google Classroom API를 통해 코스 목록을 가져오고,
 * Fuse.js를 사용해 사용자가 입력한 검색어로 코스 이름을 검색합니다.
 */
function searchCourses(auth) {
  const classroom = google.classroom({ version: 'v1', auth });
  classroom.courses.list({}, (err, res) => {
    if (err) {
      console.error('Error fetching courses:', err);
      return mainMenu(auth);
    }
    const courses = res.data.courses;
    if (!courses || courses.length === 0) {
      console.log('No courses found.');
      return mainMenu(auth);
    }
    inquirer
      .prompt([
        {
          type: 'input',
          name: 'query',
          message: 'Enter search query for courses:',
        },
      ])
      .then((answers) => {
        const query = answers.query;
        const fuse = new Fuse(courses, {
          keys: ['name'],
          includeScore: true,
          threshold: 0.4,
        });
        const results = fuse.search(query);
        console.log(`\nSearch results for "${query}":\n`);
        if (results.length === 0) {
          console.log('No matches found.');
        } else {
          results.forEach((result) => {
            const course = result.item;
            console.log(
              `[${course.courseState}] ${course.name} (ID: ${course.id}) - Score: ${result.score.toFixed(3)}`
            );
          });
        }
        mainMenu(auth);
      });
  });
}

/**
 * 특정 코스 선택 메뉴를 제공하여 사용자가 선택한 코스에 대해
 * 과제나 공지사항 검색을 진행합니다.
 */
function chooseCourse(auth, type) {
  const classroom = google.classroom({ version: 'v1', auth });
  classroom.courses.list({}, (err, res) => {
    if (err) {
      console.error('Error fetching courses:', err);
      return mainMenu(auth);
    }
    const courses = res.data.courses;
    if (!courses || courses.length === 0) {
      console.log('No courses found.');
      return mainMenu(auth);
    }
    inquirer
      .prompt([
        {
          type: 'list',
          name: 'selectedCourse',
          message: `Select a course to search ${type}:`,
          choices: courses.map((course) => ({
            name: course.name,
            value: course.id,
          })),
        },
      ])
      .then((answers) => {
        const courseId = answers.selectedCourse;
        if (type === 'assignments') {
          searchAssignments(auth, courseId);
        } else if (type === 'announcements') {
          searchAnnouncements(auth, courseId);
        }
      });
  });
}

/**
 * 선택한 코스의 과제 목록을 가져와 Fuse.js로 검색어를 검색합니다.
 */
function searchAssignments(auth, courseId) {
  const classroom = google.classroom({ version: 'v1', auth });
  classroom.courses.courseWork.list({ courseId }, (err, res) => {
    if (err) {
      console.error('Error fetching assignments:', err);
      return mainMenu(auth);
    }
    const assignments = res.data.courseWork;
    if (!assignments || assignments.length === 0) {
      console.log('No assignments found for this course.');
      return mainMenu(auth);
    }
    inquirer
      .prompt([
        {
          type: 'input',
          name: 'query',
          message: 'Enter search query for assignments:',
        },
      ])
      .then((answers) => {
        const query = answers.query;
        const fuse = new Fuse(assignments, {
          keys: ['title', 'description'],
          includeScore: true,
          threshold: 0.4,
        });
        const results = fuse.search(query);
        console.log(`\nSearch results for "${query}" in assignments:\n`);
        if (results.length === 0) {
          console.log('No matches found.');
        } else {
          results.forEach((result) => {
            const assignment = result.item;
            console.log(
              `[Assignment] ${assignment.title} (ID: ${assignment.id}) - Score: ${result.score.toFixed(3)}`
            );
          });
        }
        mainMenu(auth);
      });
  });
}

/**
 * 선택한 코스의 공지사항 목록을 가져와 Fuse.js로 검색어를 검색합니다.
 */
function searchAnnouncements(auth, courseId) {
  const classroom = google.classroom({ version: 'v1', auth });
  classroom.courses.announcements.list({ courseId }, (err, res) => {
    if (err) {
      console.error('Error fetching announcements:', err);
      return mainMenu(auth);
    }
    const announcements = res.data.announcements;
    if (!announcements || announcements.length === 0) {
      console.log('No announcements found for this course.');
      return mainMenu(auth);
    }
    inquirer
      .prompt([
        {
          type: 'input',
          name: 'query',
          message: 'Enter search query for announcements:',
        },
      ])
      .then((answers) => {
        const query = answers.query;
        const fuse = new Fuse(announcements, {
          keys: ['text'],
          includeScore: true,
          threshold: 0.4,
        });
        const results = fuse.search(query);
        console.log(`\nSearch results for "${query}" in announcements:\n`);
        if (results.length === 0) {
          console.log('No matches found.');
        } else {
          results.forEach((result) => {
            const announcement = result.item;
            let preview = announcement.text || '';
            if (preview.length > 50) preview = preview.substring(0, 50) + '...';
            console.log(
              `[Announcement] ${preview} (ID: ${announcement.id}) - Score: ${result.score.toFixed(3)}`
            );
          });
        }
        mainMenu(auth);
      });
  });
}

