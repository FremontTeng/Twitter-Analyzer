import * as $ from "jquery";
import {
  NaturalLanguageProcessingAPI,
  NLPSentimentData,
  NLPEntityData
} from "./nlp";
import { TwitterAPI, TwitterAccessToken, TweetData } from "./twitter";
import { SummaryPanel, SummaryData } from "./panels/summary_panel";
import { TweetPanel, TweetSummaryData } from "./panels/tweet_panel";
import { ErrorPanel } from "./panels/error_panel";
import { Panel } from "./panels/panel";
export class Logic {
  private nlp = new NaturalLanguageProcessingAPI();
  private twitter = new TwitterAPI();

  private twitterAuthToken = "";
  constructor() {
    this.twitter.getAuthToken(this.onReceivedAuthToken.bind(this));
    this.setupEvents();
  }
  private setupEvents() {
    $("#entry").on("click", () => {
      this.showOverlay(true);
    });

    $("#submit").on("click", this.onSearch.bind(this));
    $("#username").keypress(event => {
      if (event.key == "Enter") {
        this.onSearch();
      }
    });
    $("#compare_username").keypress(event => {
      if (event.key == "Enter") {
        this.onCompare();
      }
    });
    $("#aboutUs").on("click", () => {
      this.showAboutUs(true);
    });
    $("#returnToSearchPage").on("click", () => {
      this.showSearch(true);
    });
  }
  private showOverlay(show: boolean) {
    let opacity = show ? 1 : 0;
    let pointer = show ? "auto" : "none";
    $("#overlay")
      .animate({ opacity: opacity }, "slow")
      .css("pointer-events", pointer);
    if (show) {
      this.showSearch(false);
      this.showAboutUs(false);
    }
  }
  private showSearch(show: boolean) {
    let opacity = show ? 1 : 0;
    let pointer = show ? "auto" : "none";
    $("#mainBody")
      .animate({ opacity: opacity }, "slow")
      .css("pointer-events", pointer);
    $("#header2").animate({ opacity: opacity }, "slow");
    //$("#form1").css("opacity", opacity);
    if (show) {
      this.showAboutUs(false);
      this.showOverlay(false);
    }
    document.getElementById("username").focus();
  }

  private showAboutUs(show: boolean) {
    let opacity = show ? 1 : 0;
    let pointer = show ? "auto" : "none";
    $("#aboutUsPage")
      .animate({ opacity: opacity }, "slow")
      .css("pointer-events", pointer);
    if (show) {
      this.showSearch(false);
      this.showOverlay(false);
    }
  }
  //Get the Authorization token from twitter, this is then used as a password for doing API requests.
  private onReceivedAuthToken(data: TwitterAccessToken) {
    this.twitterAuthToken = data.access_token;
  }

  private compileText(data: TweetData[]) {
    let text = data[0].text;
    for (let i = 1; i < data.length; i++) {
      text += data[i].text;
    }
    return text;
  }

  private onSearch() {
    //Hide Overlay
    this.showOverlay(false);
    this.showSearch(true);
    //Clear the results
    $("#resultContainer").empty();
    //Show loader
    $(".loader").animate({ opacity: 1 }, "slow");

    let handle = $("#username").val() as string;
    if (handle == null) {
      $("#username").val($("#startingHandle").val() as string);
      let handle = $("#username").val() as string;
    } else {
      $("#startingHandle").val($("#username").val() as string);
    }
    this.fetchSummaryData(handle, (data: SummaryData) => {
      this.displayPanels(data);
    });
  }
  private onCompare() {
    //Hide Overlay
    this.showOverlay(false);
    this.showSearch(true);
    //Clear the results
    $("#resultContainer").empty();
    //Show loader
    $(".loader").animate({ opacity: 1 }, "slow");

    let handles = [
      $("#username").val() as string,
      $("#compare_username").val() as string
    ];
    let summaryDataArr: SummaryData[] = [];
    handles.forEach(handle => {
      this.fetchSummaryData(handle, (data: SummaryData) => {
        summaryDataArr.push(data);
        if (summaryDataArr.length == handles.length) {
          this.displayPanels(...summaryDataArr);
        }
      });
    });
  }
  private createTweetPanels(
    dataArr: { tweetData: TweetData; sentimentData: NLPSentimentData }[],
    numTweets: number
  ) {
    let actualNumTweets = Math.min(dataArr.length, numTweets);

    for (let i = 0; i < actualNumTweets; i++) {
      let data = dataArr[i];
      let tweetData: TweetSummaryData = {
        tweetData: data.tweetData,
        sentimentData: data.sentimentData,
        entityData: null
      };
      let panel = new TweetPanel(tweetData);
      panel.appendTo($("#resultContainer"));
    }
  }
  private displayPanels(...data: SummaryData[]) {
    let panel = new SummaryPanel(data);
    panel.appendTo($("#resultContainer"));
    this.createTweetPanels(data[0].tweets, 5);
    $("#resultContainer").fadeIn("slow");
    $(".loader").animate({ opacity: 0 }, "slow");
    $("#compare_input_field").css({ opacity: 1, "pointer-events": "all" });
  }
  private fetchSummaryData(
    handle: string,
    callback: (data: SummaryData) => void
  ) {
    this.twitter.fetchTweets(
      this.twitterAuthToken,
      handle,
      (tweets: TweetData[]) => {
        //Convert tweets to any-type in order to check if an error has been returned.
        let error = tweets as any;
        if (error.error) {
          displayError(
            "Error fetching tweets from Twitter, this is usually caused by searching for nonexisting Twitter-accounts."
          );
          return;
        }
        //If no error, proceed as normal:
        let text = this.compileText(tweets);
        let summaryData: SummaryData = {
          user: tweets[0].user,
          compiledText: text,
          overallSentiment: null,
          tweets: new Array(tweets.length),
          entityResult: null
        };
        let overallDone = 0;
        this.nlp.fetchSentimentAnalysis(text, (result: NLPSentimentData) => {
          //Error occurs when result is null
          if (!result || !result.documentSentiment) {
            displayError("Error fetching sentiment data from Google.");
            return;
          }
          summaryData.overallSentiment = result;
          overallDone++;
          if (overallDone == 2 && tweetsDone == tweets.length) {
            overallDone = 0;
            tweetsDone = 0;
            callback(summaryData);
          }
        });
        this.nlp.fetchEntityAnalysis(text, (result: NLPEntityData) => {
          //Error occurs when result is null
          if (!result) {
            displayError("Error fetching entity data from Google.");
            return;
          }
          summaryData.entityResult = result;
          overallDone++;
          if (overallDone == 2 && tweetsDone == tweets.length) {
            overallDone = 0;
            tweetsDone = 0;
            callback(summaryData);
          }
        });
        let tweetsDone = 0;
        for (let i = 0; i < tweets.length; i++) {
          let tweet = tweets[i];
          this.nlp.fetchSentimentAnalysis(
            tweet.text,
            (result: NLPSentimentData) => {
              //Error occurs when result is null
              if (!result || !result.documentSentiment) {
                displayError("Error fetching sentiment data from Google.");
                return;
              }
              summaryData.tweets[i] = {
                tweetData: tweet,
                sentimentData: result
              };
              tweetsDone++;
              if (overallDone == 2 && tweetsDone == tweets.length) {
                overallDone = 0;
                tweetsDone = 0;
                callback(summaryData);
              }
            }
          );
        }
      }
    );
  }
}
export function displayError(msg: string) {
  let errorPanel = new ErrorPanel(msg);
  errorPanel.appendTo($("#resultContainer"));
  $("#resultContainer").fadeIn("slow");
  $(".loader").animate({ opacity: 0 }, "slow");
}
