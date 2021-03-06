import * as Request from "request";
import { displayError } from "./logic";

export type NLPSentimentData = {
  /** Sentiment for the whole text */
  documentSentiment: Sentiment;
  language: String;
  /** The sentences that make up this text */
  sentences: Sentence[];
  error: Error;
};
export type NLPEntityData = {
  entities: Entity[];
  language: String;
  error: Error;
};
export type Entity = {
  name: string;
  type: string;
  /** How noticable/important this entity is */
  salience: number;
  /** Sentiment for the entity */
  sentiment: Sentiment;
  mentions: Mention[];
};
export type Sentiment = {
  /** Represents the emotion */
  magnitude: number;
  /** Represent positivity, is in range [-1, 1] */
  score: number;
};
export type Error = {
  code: number;
  message: string;
};
type Sentence = {
  text: string;
  /** Sentiment for the sentence */
  sentiment: Sentiment;
};
type Mention = {
  sentiment: Sentiment;
  type: String;
};
// ===== Test Data below ====
let sentipos: Sentiment = {
  magnitude: 0.8,
  score: 42
};
let sente: Sentence = {
  text: "I love pizza",
  sentiment: sentipos
};
export const TEST_DATA: NLPSentimentData = {
  documentSentiment: sentipos,
  language: "US-EN",
  sentences: [sente, sente],
  error: null
};
let TEST_ENTITY: Entity = {
  name: "positive-thing",
  type: "a-thing",
  salience: 50,
  sentiment: sentipos,
  mentions: null
};
export const TEST_ENTITYDATA: NLPEntityData = {
  entities: [TEST_ENTITY, TEST_ENTITY, TEST_ENTITY],
  language: "EN-US",
  error: null
};

// ===== Test Data above ====

const apiKey = "AIzaSyAazERmq44usU8UkExRTQ0N7ODWZ2yDCqQ";
const sentimentAnalysisURL =
  "https://language.googleapis.com/v1beta2/documents:analyzeSentiment?key=" +
  apiKey;
const entityAnalysisURL =
  "https://language.googleapis.com/v1beta2/documents:analyzeEntitySentiment?key=" +
  apiKey;
export class NaturalLanguageProcessingAPI {
  private fetchData(url: string, text: String, callback: (data: any) => void) {
    let postData = {
      content: text,
      type: "PLAIN_TEXT"
    };
    Request(
      {
        url: url,
        method: "POST",
        json: true, // <--Very important!!!
        body: { document: postData }
      },
      function(error, response, body) {
        if (error) {
          console.log(error);
          displayError("Error connecting to the Google API.");
        } else {
          callback(body);
        }
      }
    );
  }
  /**
   * Analyzes the given text for sentiment. Later returns the results in the callback method.
   */
  public fetchSentimentAnalysis(
    text: String,
    callback: (data: NLPSentimentData) => void
  ) {
    this.fetchData(sentimentAnalysisURL, text, callback);
  }
  /**
   * Analyzes the given text for entities. Later returns the results in the callback method.
   */
  public fetchEntityAnalysis(
    text: String,
    callback: (data: NLPEntityData) => void
  ) {
    this.fetchData(entityAnalysisURL, text, callback);
  }
}
