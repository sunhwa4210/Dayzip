// colors.ts

// 1. 기본 색상 정의
export const BASE_COLORS = {
    WHITE: '#FFFFFF',
    BLACK: '#000000',
    RED: '#F14A41',
    PRIMARY: '#FA6400',
    GREY_2: '#F5F5F5',
  };
  
  // 2. 명도 기반 회색 계열 스케일
  export const GRAY_SCALE = {
    LIGHT: {
      1: '#ffffff',
      2: '#f5f5f5',
      3: '#eeeeee',
      4: '#e0e0e0',
      5: '#b5b5b5', // disabled
      6: '#ababab',
      7: '#8c8c8c',
      8: '#7c7c7c',
      9: '#3f3f3f', // default
      10: '#1b1b1b', // strong
    },
    DARK: {
      1: '#121212',
      2: '#212121',
      3: '#303030',
      4: '#3b3b3b',
      5: '#616161', // disabled
      6: '#787878',
      7: '#a3a3a3',
      8: '#b2b2b2',
      9: '#dbdbdb', // default
      10: '#fafafa', // strong
    },
  };
  
  // 3. 프라이머리 컬러 스케일 (명도순, 6은 기본값)
  export const PRIMARY_SCALE = {
    LIGHT: {
      1: '#fff0e6',
      2: '#ffe0cc',
      3: '#ffc299',
      4: '#ffa366',
      5: '#ff8533',
      6: '#ff763c', // default
      7: '#cc5200',
      8: '#993d00',
      9: '#662900',
      10: '#331400',
    },
    DARK: {
      1: '#451d08',
      2: '#5c270a',
      3: '#73300d',
      4: '#a14412',
      5: '#cf5717',
      6: '#e87130', // default
      7: '#ed905e',
      8: '#f2b08c',
      9: '#f7d0ba',
      10: '#fcefe8',
    },
  };
  
  // 4. 시맨틱 색상 (경고, 에러, 성공, 정보 등)
  export const SEMANTIC_COLORS = {
    LIGHT: {
      warning: {
        1: '#fff9e6',
        6: '#ffc400',
      },
      critical: {
        1: '#fde8e7',
        6: '#f14a41',
      },
      success: {
        1: '#ebfaee',
        6: '#34c759',
      },
      information: {
        1: '#e6f2ff',
        6: '#007aff',
      },
    },
    DARK: {
      warning: {
        1: '#141105',
        6: '#ceb348',
      },
      critical: {
        1: '#3f100e',
        6: '#df726d',
      },
      success: {
        1: '#08120a',
        6: '#5fb976',
      },
      information: {
        1: '#060d14',
        6: '#4c88c9',
      },
    },
  };
  
  // 5. 모달, 섀도우 등 시맨틱 UI 요소 색상
  export const SEMANTIC_UI = {
    modal: {
      LIGHT: {
        background: '#ffffff',
        shadow1: 'rgba(0, 0, 0, 0.03)',
        shadow2: 'rgba(0, 0, 0, 0.10)',
        shadow3: 'rgba(0, 0, 0, 0.05)',
        outline: 'rgba(255, 255, 255, 0)',
      },
      DARK: {
        background: '#212121',
        shadow1: 'rgba(0, 0, 0, 0.16)',
        shadow2: 'rgba(0, 0, 0, 0.40)',
        shadow3: 'rgba(0, 0, 0, 0.20)',
        outline: '#3b3b3b',
      },
    },
    static: {
      LIGHT: {
        white: '#ffffff',
        black: '#1b1b1b',
      },
      DARK: {
        white: '#fafafa',
        black: '#121212',
      },
    },
  };

  
  