# GenAI_word_app
1. Data Structure
Hash table: googleId -> userId

User
|── userId      // 
|── googleId    // Google OAuth provide
|── Data        // (Could be Student, Supplier or Admin)
|── email       // 使用者的郵件信箱(Google OAuth provide)
|── Phonenumber // 使用者的手機號碼
|── Birthday    // 使用者的生日
|── name        // 使用者的名稱(Google OAuth provided)
|── Langauge    // 使用者的母語
|── Islock      // 該使用者帳號是否上鎖(Boolean，處理侵害或非法使用時讓帳戶停權)

Student
|── LvocabuIDs  // (vocabulary_ID list)存放單字本ID的list
|── LcouponIDs  // (coupon ID list)存放優惠券ID的list
|── Para_game   // (game parameter)遊戲所需的參數(如生命值、攻擊力等等)，視為未知datastructure
|── Payments    // 存放付款資料(如信用卡資料)，視為未知datastructure
|── LfriendIDs  // (friend ID list)

Supplier          // 提供優惠券的廠商
|── LsuppcoIDs  // (supply coupon ID list)存放題該廠商所提供優惠券ID的list
|── Payments    // 存放付款資料(如信用卡資料)，視為未知datastructure
|── Lstores     // 存放店家店鋪資訊的list

Lstores
|── Name        // 分店名稱
|── Location    // 分店位置
|── Website     // 分店網站
|── Lscores     // score list = [ , , , , ]存放使用者對於該分店的分數(評論分數i的人數，i從1開始)
|── Lcomments   // (comments list)存放使用者對於該分店的評論

Admin
|── Permissions // 管理者權限

Coupon
|── Name        // 優惠券名稱
|── Period      // 使用期限(截止日期)
|── Link        // coupon QRcode or URL
|── Text        // 折價券內容
|── Picture     // 折價券圖片設計

Vocabulary
|── Name        // 單字本名稱
|── LangUse     // 背誦單字的語言
|── LangExp     // 解釋單字的語言
|── Lwords      // 存放單字(資料結構Word)的list
|── Copyrights  // 單字本版權
|── Establisher // 單字本建立者的ID

Word
|── Word         // 單字
|── Spelling     // 拼音，可以為None(象形文字可能需要拼音顯示)
|── Explanation  // 單字解釋
|── PartOfSpeech // 詞性，可以為None
|── Sentence     // 範例句ex.

2. Database
User_List       // 存放User的dictionary(key為User.Name與User.Email的hash value)
Coupon_List     // 存放優惠券的list
Vocabulary_List // 存放單字本的list

3. 開發規格
UI 框架 ：Material UI
資料庫：Prisma + MongoDB
環境設定： dotenv讀取.env檔案完成設定(.env檔案會被cursor ignore)

4. 分頁架構

/login 處理帳戶登入，連結時自動切換

/student
    /vocabulary  // 建立單字本
    /store       // 點數兌換
    /setting     // 設定(帳戶資訊、付款資訊等)
    /game        // 單字測驗遊戲
    /review      // 單字複習

/supplier
    /setting     // 設定(帳戶資訊、付款資訊等)
    /coupon      // 優惠券管理與上傳
    /store       // 店鋪資訊編輯與查看(包含使用者評分與回饋)

/admin
    /setting    // 網頁參數等
    /user       // 用戶資訊管理(查看、編輯、刪除、新增與上鎖等)
    /vocabulary // 資料庫單字本管理(查看、編輯、刪除、新增等)
    /coupon     // 資料庫優惠券管理(查看、編輯、刪除、新增等)

5. 實作功能
(1) script指定某個userID為管理人(把該使用者原本student或supplier的資料刪除換成admin)
(2) /admin的所有功能，每筆資料table化佔一個raw，右側放CRUD button(查看、編輯、刪除)，最右上方放add button新增資料，且資料庫所有內容僅須在查看後display，例如單字本顯示Vocabulay.Name, LangUse, LangExp, 單字數與建立者ID即可，查看才需檢查單字內容(可CRUD)，且內容較多時，不要全部loading再display，比如有400字就分50字8頁display，先讀到先display
(3) 單字本可以透過上傳(例如papaparse)讀取excel，first row會是label如(word, spelling, etc.)，但PartOfSpeech與spelling不一定存在
(4) student, supplier先不用實作功能，僅需要左側有個欄位，click時會有button可以跳到其他/的page(不須另開視窗)，且每個分頁右上方有home button可以回到/supplier或/student
(5) 網頁打開時能讀取裝置長寬將網頁等比例縮放，如果遇到旋轉(例如手機垂直或水平切換)，也需要real time做畫面最佳化調整
(6) 既有OAuth登入與測試登入請保留
(7) OAuth登入時若是新使用者，請導向/edit讓使用者決定身分(student or client)，才能初始化用戶內容並放到資料庫，如果沒有決定就離開，請不要儲存資料到資料庫中，下次登入時一樣會被當作初次使用者