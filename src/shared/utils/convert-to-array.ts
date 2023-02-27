export const convertStringToArray = (stringArray: string): any[] => {
  console.log({ stringArray });

  const array = stringArray.replace(/[\[\]]/g, '').split(',');

  const result = array.map((element) => {
    element = element.trim();
    if (element.startsWith("'") && element.endsWith("'")) {
      return element.slice(1, -1);
    } else if (!isNaN(Number(element))) {
      return Number(element);
    } else if (element === 'true') {
      return true;
    } else if (element === 'false') {
      return false;
    } else {
      return element;
    }
  });

  return result;
};
