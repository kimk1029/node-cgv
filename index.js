const puppeteer = require("puppeteer");
const nodemailer = require("nodemailer");
const config = require("./config");

const areaCode = {
  서울: 1,
  경기: 2,
  인천: 3,
  강원: 4,
  대전: 5,
  충청: 5,
  대구: 6,
  부산: 7,
  울산: 7,
  경상: 8,
  광주: 9,
  전라: 9,
  제주: 9,
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: config.user,
    pass: config.pass,
  },
});

const sendMail = (image) => {
  const mailOptions = {
    from: "junggeehoon@gmail.com",
    to: "geehoon.jung@sjsu.edu",
    subject: "영화예매!!",
    text: `빨리 예매하세요!`,
    attachments: [
      {
        path: `./screenshot/${image}.png`,
      },
    ],
  };
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};

const visitHomepage = async () => {
  const browser = await puppeteer.launch({
    // Puppeteer용 브라우저 실행
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    ignoreHTTPSErrors: true,
    dumpio: false,
    defaultViewport: {
      width: 1200,
      height: 1080,
    },
    headless: false,
    devtools: false,
  });
  const page = await browser.newPage();
  page.on("dialog", async (dialog) => {
    await dialog.dismiss();
  });
  const config = {
    homepage: "http://www.cgv.co.kr/reserve/show-times/",
    title: "토이 스토리 4",
    region: "서울",
    theater: "CGV용산아이파크몰",
    year: "2019",
    month: "06",
    day: "26",
  };
  try {
    await page.goto(config.homepage, {
      waitUntil: "domcontentloaded",
    });

    await page.click(
      `#contents > div.sect-common > div > div.sect-city > ul > li:nth-child(${
        areaCode[config.region]
      })`
    ); //지역선택

    let nthElement = 1;
    let theater = await page.evaluate(() => {
      return document.querySelector(
        `#contents > div.sect-common > div > div.sect-city > ul > li.on > div > ul > li:nth-child(${1}) > a`
      ).innerHTML;
    });

    while (theater !== config.theater) {
      nthElement++;
      theater = await page.evaluate((nthElement) => {
        return document.querySelector(
          `#contents > div.sect-common > div > div.sect-city > ul > li.on > div > ul > li:nth-child(${nthElement}) > a`
        ).innerHTML;
      }, nthElement);
    }
    const theaterCodeInner = await page.evaluate((nthElement) => {
      return document.querySelector(
        `#contents > div.sect-common > div > div.sect-city > ul > li.on > div > ul > li:nth-child(${nthElement})`
      ).innerHTML;
    }, nthElement);
    const theaterCode = theaterCodeInner.split("&")[1].split("=")[1];
    const url = `http://www.cgv.co.kr/common/showtimes/iframeTheater.aspx?areacode=0${
      areaCode[config.region]
    }&theatercode=${theaterCode}&date=${config.year}${config.month}${
      config.day
    }`;

    await page.goto(url);

    const day = await page.evaluate(() => {
      return document.querySelector(`li.on > div > a > strong`).innerText;
    });

    let flag = false;
    if (day === config.day) {
      const moviesNumber = await page.evaluate(() => {
        return document.querySelectorAll(`.info-movie`).length;
      });

      for (let i = 1; i <= moviesNumber; i++) {
        const movie = await page.evaluate((i) => {
          return document.querySelector(
            `body > div > div.sect-showtimes > ul > li:nth-child(${i}) > div > div:nth-child(1) > a > strong`
          ).innerText;
        }, i);
        if (movie === ` ${config.title}`) {
          const theaterNumber = await page.evaluate((i) => {
            return document.querySelectorAll(
              `body > div > div.sect-showtimes > ul > li:nth-child(${i}) > div > div.type-hall`
            ).length;
          }, i);
          for (let j = 2; j <= theaterNumber + 1; j++) {
            const theater = await page.evaluate(
              (i, j) => {
                return document.querySelector(
                  `body > div > div.sect-showtimes > ul > li:nth-child(${i}) > div > div:nth-child(${j}) > div:nth-child(1) > ul > li`
                ).innerText;
              },
              i,
              j
            );
            if (theater.includes("IMAX")) {
              flag = true;
              break;
            }
          }
        }
      }
    }

    if (flag) {
      const image = Date.now();
      // await page.screenshot({path: `./screenshot/${image}.png`, fullPage: true});
      // sendMail(image);
      console.log("예매하세요!");
    } else {
      console.log("기다리세요!");
    }

    return browser.close();
  } catch (err) {
    console.log(err);
  }
};
// setInterval(visitHomepage, 600000); // 10분에 한번씩
visitHomepage();
