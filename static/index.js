let { createApp } = Vue

createApp({
    data() {
        return {
            list: [],
            active: false,
            tableHeight: 500,
            uploadHarName: '',      //上传的HAR文件名
            failedList: [],         //打包失败的list
            showFailedOnly: false,  //控制是否仅显示失败图片
        }
    },
    mounted() {
    if (document.body.offsetWidth <= 768) {
        this.tableHeight = 300
    }
    },
    methods: {
    handleChange(file) {
        let that = this
        if (! /.har/.test(file.name)) {
            ElementPlus.ElMessage.error('请上传Har文件')
            return false;
        }
        ElementPlus.ElMessage.warning('解析中。。。')
        var reader = new FileReader();
        reader.onload = (e) => {
            // console.log(e.target.result)
            let resultObject = JSON.parse(reader.result)
            let entries = resultObject.log.entries
            let list = []
            entries.forEach(e => {
                if (/image/.test(e.response.content.mimeType) && ! /favicon.ico|hm.gif|google-analytics|cnzz/.test(e.request.url)) {
                    let url = e.request.url
                    let imgFileName = that.getImageFileName(url);
                    let truncatedUrl = that.getTruncatedURL(url);
                    let item = {
                        //url: url,
                        url: truncatedUrl ? truncatedUrl:url,
                        //name: url.split('/')[url.split('/').length - 1],
                        name: imgFileName ? imgFileName:url.split('/')[url.split('/').length - 1],
                        size: e.response.content.size,
                        base64: 'data:image/png;base64,' + e.response.content.text
                    }
                    console.log(imgFileName);
                    list.push(item)
                }
            });
            // console.log(list)
            ElementPlus.ElMessage.success('解析完毕')
            that.list = list
            if (list.length > 0) {
                that.active = true
            }
        };
        reader.readAsText(file.raw);
        if (file){
            this.uploadHarName = file.name.replace(/\.[^/.]+$/, ''); // 去除文件扩展名
        }
    },
    handleRemove() {
        this.list = []
        this.failedList = []     //failedList清空
        this.active = false
        this.uploadHarName = ''
    },
    filesize(fileByte = 0) {
        var fileByte = Number(fileByte)
        var fileSizeMsg = "";
        if (fileByte < 1048576) fileSizeMsg = (fileByte / 1024).toFixed(2) + "KB";
        else if (fileByte == 1048576) fileSizeMsg = "1MB";
        else if (fileByte > 1048576 && fileByte < 1073741824) fileSizeMsg = (fileByte / (1024 * 1024)).toFixed(2) + "MB";
        else if (fileByte > 1048576 && fileByte == 1073741824) fileSizeMsg = "1GB";
        else if (fileByte > 1073741824 && fileByte < 1099511627776) fileSizeMsg = (fileByte / (1024 * 1024 * 1024)).toFixed(2) + "GB";
        else fileSizeMsg = "文件大小超过1TB";
        return fileSizeMsg;
    },
    getImageBase64(image) {
        let canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height
        let ctx = canvas.getContext('2d')
        ctx.drawImage(image, 0, 0, image.width, image.height)
        // 获取图片后缀名
        /*
        let extension = image.src
            .substring(image.src.lastIndexOf('.') + 1)
            .toLowerCase()
            */
        // let name = this.getImageFileName(image.src);
        let url = image.src;
        let imgFileName = this.getImageFileName(image.src);
        let name = imgFileName ? imgFileName:url.split('/')[url.split('/').length - 1];
        let dotPositon = name.lastIndexOf('.');
        let extension = dotPositon ? name.substring(name.lastIndexOf('.') + 1).toLowerCase() : null;
        // 某些图片 url 可能没有后缀名，默认是 png
        return canvas.toDataURL('image/' + (extension ? extension : 'png'), 1)
    },
    getTruncatedURL(url){
        let filename = this.getImageFileName(url);
        if(filename){
            let index = url.lastIndexOf(filename);
            if(index != -1){
                return url.substring(0, index+filename.length);
            }
        }
        return null;
    },
    getImageFileName(url){
        let parsedUrl = new URL(url);
        let pathname = parsedUrl.pathname;
        let filenameMatch = pathname.match(/\/([^\/]+\.(png|webp|jpg|jpeg|gif|bmp|svg|ico))$/i);

        if(filenameMatch && filenameMatch[1]){
            return filenameMatch[1];
        }
        else{
            return null;
        }
    },
    downloadSingle(url, downloadName) {
        let that = this
        let link = document.createElement('a')
        link.setAttribute('download', downloadName)
        let image = new Image()
        let time = new Date().getTime()
        // 添加时间戳，防止浏览器缓存图片
        image.src = /\?/.test(url) ? url + '&timestamp=' + time : url + '?timestamp=' + time
        // 设置 crossOrigin 属性，解决图片跨域报错
        image.setAttribute('crossOrigin', 'Anonymous')
        image.onload = () => {
            link.href = that.getImageBase64(image)
            link.click()
        }
    },
    downloadZip() {
        let that = this

        let harName = this.uploadHarName || '原神网页小活动资源包'
        harName = harName.replace(/[^\w\u4e00-\u9fa5]/g, '_')

        ElementPlus.ElMessageBox.prompt('请输入保存文件名', '提示', {
            confirmButtonText: '确认打包',
            cancelButtonText: '取消',
            inputValue: harName,
            inputPattern: /^[\u4E00-\u9FA5A-Za-z0-9_]+$/,
            inputErrorMessage: '只允许中文、英文、数字和下划线',
        }).then(({ value }) => {
            let zipName = value
            let zip = new JSZip()
            let fileFolder = zip.folder(zipName) // 创建 zipName 文件夹
            let fileList = []
            let successCount = 0
            let failCount =0
            let failedImages = []

            ElementPlus.ElMessage.warning('正在打包中。。。')
            let completedRequests = 0

            this.list.forEach(e => {
                let name = e.name
                let image = new Image()
                image.setAttribute('crossOrigin', 'Anonymous') // 设置 crossOrigin 属性，解决图片跨域报错
                // 添加时间戳，防止浏览器缓存图片
                let time = new Date().getTime()
                image.src = /\?/.test(e.url) ? e.url + '&timestamp=' + time : e.url + '?timestamp=' + time
                image.onload = async() => {
                    completedRequests++
                    let url = await that.getImageBase64(image)
                    fileList.push({
                        name: name,
                        img: url.substring(22) // 截取 data:image/png;base64, 后的数据
                    })
                    successCount++

                    if (completedRequests == that.list.length){
                        that.showStats(successCount, failCount, failedImages)

                        if (fileList.length){
                            fileList.forEach(file => {
                                fileFolder.file(file.name, file.img, {base64:true})
                            })
                            zip.generateAsync({type: 'blob' }).then(content => {
                                ElementPlus.ElMessage.success('打包完毕')
                                saveAs(content, zipName + '.zip')
                            })
                        }else{
                            ElementPlus.ElMessage.error('所有图片请求失败，无法打包');
                        }
                    }
                }

                image.onerror = (error) => {
                    completedRequests++
                    failCount++
                    let url = that.getImageBase64(image)
                    failedImages.push(e)
                    if (completedRequests == that.list.length){
                        that.showStats(successCount, failCount, failedImages)

                        if (fileList.length){
                            fileList.forEach(file => {
                                fileFolder.file(file.name, file.img, {base64:true})
                            })
                            zip.generateAsync({type: 'blob' }).then(content => {
                                ElementPlus.ElMessage.success('打包完毕')
                                saveAs(content, zipName + '.zip')
                            })
                        }else{
                            ElementPlus.ElMessage.error('所有图片请求失败，无法打包');
                        }
                    }
                }
            });
        })
    },

    showStats(successCount, failCount, failedImages){
        let message = `打包完成！\n成功：${successCount}，失败：${failCount}`;
        ElementPlus.ElMessageBox.confirm(message, '统计信息', {
            confirmButtonText: '查看失败列表',
            cancelButtonText: '关闭',
        }).then(() => {
            // 点击查看失败列表按钮时，直接更新 list 显示失败的图片
            this.failedList = failedImages;
            this.showFailedOnly = true; // 设置只显示失败的图片
        }).catch(() => {
            // 关闭按钮处理
            ElementPlus.ElMessage.info('关闭统计信息');
        });
    },

    toggleList(){
        this.showFailedOnly = !this.showFailedOnly;
    },
    }
}).use(ElementPlus).mount('#app')
