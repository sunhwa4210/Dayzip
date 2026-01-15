declare module 'rn-wordcloud' {
    export type WordCloudWord = {
      text: string;
      value: number;
      color?: string;
      font?: string;
      rotate?: number;
    };
  
    // 라이브러리 시그니처가 단순해서 any로 열어두되 기본 제네릭 제공
    const WordCloud: any;
    export default WordCloud;
  }
  