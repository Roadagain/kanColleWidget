export function GetHistory(message) {
  console.log("Controllers/Message/GetHistory", message, this.sender);
  // return {foo: 'bar'};
  return Promise.resolve({foo: "promise!!"});
}
