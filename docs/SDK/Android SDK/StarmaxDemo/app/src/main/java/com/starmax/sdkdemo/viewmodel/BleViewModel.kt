package com.starmax.sdkdemo.viewmodel

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.content.BroadcastReceiver
import android.content.ClipData
import android.content.ClipboardManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.ServiceConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import android.widget.Toast
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.clj.fastble.BleManager
import com.clj.fastble.callback.BleGattCallback
import com.clj.fastble.callback.BleIndicateCallback
import com.clj.fastble.callback.BleMtuChangedCallback
import com.clj.fastble.callback.BleNotifyCallback
import com.clj.fastble.callback.BleRssiCallback
import com.clj.fastble.callback.BleWriteCallback
import com.clj.fastble.data.BleDevice
import com.clj.fastble.exception.BleException
import com.starmax.bluetoothsdk.BleFileSender
import com.starmax.bluetoothsdk.BleFileSenderListener
import com.starmax.bluetoothsdk.BmpUtils
import com.starmax.bluetoothsdk.Notify
import com.starmax.bluetoothsdk.StarmaxBleClient
import com.starmax.bluetoothsdk.StarmaxSend
import com.starmax.bluetoothsdk.StarmaxSendRequest
import com.starmax.bluetoothsdk.Utils
import com.starmax.bluetoothsdk.data.Clock
import com.starmax.bluetoothsdk.data.EventReminder
import com.starmax.bluetoothsdk.data.HistoryType
import com.starmax.bluetoothsdk.data.MessageType
import com.starmax.bluetoothsdk.data.NotifyType
import com.starmax.bluetoothsdk.data.SummerWorldClock
import com.starmax.bluetoothsdk.data.WeatherDay
import com.starmax.bluetoothsdk.factory.SportHistoryFactory
import com.starmax.bluetoothsdk.factory.SummerWorldClockFactory
import com.starmax.bluetoothsdk.factory.WeatherSevenFactory
import com.starmax.net.repository.CrackRepository
import com.starmax.net.repository.UiRepository
import com.starmax.sdkdemo.service.RxBleService
import com.starmax.sdkdemo.utils.NetFileUtils
import com.starmax.sdkdemo.utils.SlmM1Crack
import com.starmax.sdkdemo.utils.TestRepository
import io.reactivex.disposables.CompositeDisposable
import io.reactivex.subjects.PublishSubject
import kotlinx.coroutines.launch
import org.json.JSONObject
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject
import java.io.File
import java.io.FileInputStream
import java.io.FileNotFoundException
import java.lang.Integer.min
import java.lang.ref.SoftReference
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.Calendar
import java.util.Date
import java.util.UUID


enum class BleState {
    DISCONNECTED,
    CONNECTTING,
    CONNECTED
}

class BleViewModel() : ViewModel(), KoinComponent {
    private var savePath = ""
    private var localBasePath = ""

    var tryOpenNotify = mutableStateOf(true)
        private set

    /**
     * 写
     */
    val WriteServiceUUID = UUID.fromString("6e400001-b5a3-f393-e0a9-e50e24dcca9d")
    val WriteCharacteristicUUID = UUID.fromString("6e400002-b5a3-f393-e0a9-e50e24dcca9d")

    /**
     * 读
     */
    val NotifyServiceUUID = UUID.fromString("6e400001-b5a3-f393-e0a9-e50e24dcca9d")
    val NotifyCharacteristicUUID = UUID.fromString("6e400003-b5a3-f393-e0a9-e50e24dcca9d")

    var bleDevice: SoftReference<BleDevice>? by mutableStateOf(null)
        private set

    var bleGatt: SoftReference<BluetoothGatt>? by mutableStateOf(null)
        private set

    var bleModel = ""
    var bleVersion = ""
    var bleUiVersion = ""
    var uiSupportDifferentialUpgrade = false

    var disconnectSubject = PublishSubject.create<Int>()

    var originData = mutableStateOf("")
        private set

    var bleState by mutableStateOf(BleState.DISCONNECTED)
        private set

    var bleStateLiveData = MutableLiveData(BleState.DISCONNECTED)

    var bleMessage = mutableStateOf("")
        private set

    val bleStateLabel: String
        get() {
            val data = when (bleState) {
                BleState.DISCONNECTED -> "已断开"
                BleState.CONNECTTING -> "连接中"
                BleState.CONNECTED -> "已连接"
            }
            return data
        }

    var bleResponse = mutableStateOf("")
        private set
    var bleResponseLabel = mutableStateOf("")
        private set

    val context: Context by inject()

    private val sendDisposable = CompositeDisposable()
    private val messageDisposable = CompositeDisposable()

    var imageUri: Uri? = null
    var binUri: Uri? = null

    var msgType = 0
    var msgContent = 0

    var packageId = 0

    private var bleService: RxBleService? = null

    private val serviceConnection: ServiceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName, service: IBinder) {
            val binder: RxBleService.RCBinder = service as RxBleService.RCBinder
            bleService = binder.service
            Log.e("BleViewModel", "-- RxBleService-- 已连接")
        }

        override fun onServiceDisconnected(name: ComponentName) {
            bleService = null
            Log.e("BleViewModel", "-- RxBleService-- 已断连")
        }
    }

    var bleGattCallback: BleGattCallback = object : BleGattCallback() {
        override fun onStartConnect() {
            bleState = BleState.CONNECTTING
            bleStateLiveData.postValue(bleState)
            bleMessage.value = "蓝牙正在连接"
        }

        override fun onConnectFail(bleDevice: BleDevice?, exception: BleException?) {
            bleState = BleState.DISCONNECTED
            bleStateLiveData.postValue(bleState)
            bleMessage.value = "蓝牙连接失败" + exception.toString()
        }

        override fun onConnectSuccess(
            newBleDevice: BleDevice?,
            gatt: BluetoothGatt?,
            status: Int
        ) {
            bleDevice = SoftReference(newBleDevice)
            bleState = BleState.CONNECTED
            bleGatt = SoftReference(gatt)
            bleStateLiveData.postValue(bleState)
            bleMessage.value = "蓝牙连接成功"

            Log.d("BleViewModel",gatt?.getService(NotifyServiceUUID).toString())

            if(gatt?.getService(NotifyServiceUUID) == null){
                Handler(Looper.getMainLooper()).postDelayed({
                    gatt?.discoverServices()
                },1000)
                return
            }

            Handler(Looper.getMainLooper()).postDelayed({
                if(tryOpenNotify.value){
                    openNotify(bleDevice!!.get())
                }else{
                    openIndicate(bleDevice!!.get())
                }
            },3000)

        }

        override fun onDisConnected(
            isActiveDisConnected: Boolean,
            device: BleDevice?,
            gatt: BluetoothGatt?,
            status: Int
        ) {
            bleState = BleState.DISCONNECTED
            bleGatt = SoftReference(gatt)
            bleStateLiveData.postValue(bleState)
            bleMessage.value = "蓝牙连接断开"
            disconnectSubject.onNext(1)

            //isActiveDisConnected 为false时，尝试重连，我这里是延迟2秒
        }

        override fun onMtuChanged(gatt: BluetoothGatt?, mtu: Int, status: Int) {

        }

    }

    init {
        initPath()
        //蓝牙打开、关闭广播监听
        context.registerReceiver(BluetoothListenerReceiver(this), makeFilter())
        StarmaxBleClient.instance.setWrite { byteArray -> sendMsg(byteArray) }
    }

    fun setNotify(boolean: Boolean){
        tryOpenNotify.value = boolean
    }

    fun getDeviceName(): String {
        val name = bleDevice?.get()?.name;
        if (name != null) {
            return name;
        }

        return "";
    }

    fun initPath() {
        var basepath = context.getExternalFilesDir(null)?.path
        if (basepath == null) {
            basepath = Environment.getExternalStorageDirectory().absolutePath
        }
        localBasePath = basepath!!
        savePath = basepath + "/SDKDemo/Device_update/"
        println("下载地址：" + savePath)
    }

    fun connect(newBleDevice: BleDevice?) {
        bleDevice = SoftReference(newBleDevice)
        if (bleDevice != null) {
            BleManager.getInstance().connect(bleDevice!!.get(), bleGattCallback)
        }
    }

    fun getRssi() {
        BleManager.getInstance().readRssi(bleDevice!!.get(), object : BleRssiCallback() {
            override fun onRssiSuccess(rssi: Int) {
                bleResponseLabel.value = "信号强度：" + rssi
            }

            override fun onRssiFailure(exception: BleException?) {
                TODO("Not yet implemented")
            }
        })
    }

    fun openIndicate(newBleDevice: BleDevice?) {
        BleManager.getInstance().indicate(
            newBleDevice,
            NotifyServiceUUID.toString(),
            NotifyCharacteristicUUID.toString(),
            object : BleIndicateCallback() {
                override fun onIndicateSuccess() {
                    bleMessage.value = "打开indicate成功"
                    handleOpenSuccess()
                }

                override fun onIndicateFailure(exception: BleException?) {
                    bleMessage.value = "打开indicate失败：$exception"
                }

                @SuppressLint("MissingPermission", "NewApi")
                override fun onCharacteristicChanged(data: ByteArray) {
                    StarmaxBleClient.instance.notify(data)
                }
            })
    }

    fun openNotify(newBleDevice: BleDevice?) {
        BleManager.getInstance().notify(
            newBleDevice,
            NotifyServiceUUID.toString(),
            NotifyCharacteristicUUID.toString(),
            object : BleNotifyCallback() {
                override fun onNotifySuccess() {
                    bleMessage.value = "打开notify成功"
                    handleOpenSuccess()
                }

                override fun onNotifyFailure(exception: BleException) {
                    bleMessage.value = "打开notify失败：$exception"
                }

                @SuppressLint("MissingPermission", "NewApi")
                override fun onCharacteristicChanged(data: ByteArray) {
                    Utils.p(data)
                    StarmaxBleClient.instance.notify(data)
                }
            })
    }

    private fun handleOpenSuccess(){
        TestRepository.testLocal(localBasePath, Date().toString() + "\n", "log.txt")
        changeMtu {
            StarmaxBleClient.instance.notifyStream()
                .takeUntil(disconnectSubject)
                .subscribe(
                    {
                        if(it.data is Notify.StepHistory){
                            originData.value =
                                it.byteArray.asList().drop(7).chunked(12).map {
                                        byteArray -> byteArray.map { byte-> String.format("%02X", byte)}.toString()
                                }.joinToString("\n")
                        }else if(it.data is Notify.OriginSleepHistory){
                            originData.value =  it.byteArray.asList().drop(7).chunked(120).mapIndexed {
                                    hourIndex,hourByteArray -> "${hourIndex}小時：\n"+(hourByteArray.chunked(10).map {
                                        lineByteArray -> lineByteArray.chunked(2).map { minuteByteArray -> minuteByteArray.reversed().map {  minuteByte -> String.format("%02X", minuteByte) }.joinToString("")}.joinToString(",")
                                    }.joinToString("\n"))
                            }.joinToString("\n")
                        }else{
                            originData.value =
                                it.byteArray.map { String.format("%02X", it) }.toString()
                        }
                        //bleResponse.value = it.data.toString()

                        if (it.data is Notify.Reply) {
                            if((it.data as Notify.Reply).type == NotifyType.Log.name){
                                Utils.p(it.byteArray)
                                TestRepository.testLocal(
                                    localBasePath,
                                    it.byteArray.toString(Charsets.US_ASCII).replace("TAG=","\nTAG="),
                                    "saiwei.txt"
                                )
                            }
                        }

                        if(it.data !is Notify.Diff){
                            if(it.data is Notify.TempHistory){
                                if(!(it.data as Notify.TempHistory).hasNext){
                                    TestRepository.testLocal(localBasePath,
                                        it.byteArray.drop(7).map {
                                            String.format(
                                                "0x%02X",
                                                it
                                            )
                                        }.chunked(40).map {
                                            it.joinToString(",")
                                        }.joinToString(",\n") + ",\n\n\n",
                                        "temp.txt"
                                    )
                                }
                            }else if(it.data is Notify.OriginSleepHistory){
                                if(!(it.data as Notify.OriginSleepHistory).hasNext){
                                    TestRepository.testLocal(localBasePath,
                                        it.byteArray.drop(7).map {
                                            String.format(
                                                "0x%02X",
                                                it
                                            )
                                        }.chunked(40).map {
                                            it.joinToString(",")
                                        }.joinToString(",\n") + ",\n\n\n",
                                        "origin_sleep.txt"
                                    )
                                }
                            }else{
//                                TestRepository.testLocal(localBasePath,
//                                    Date().toString() + "\n" + "\n" + it.byteArray.map {
//                                        String.format(
//                                            "0x%02X",
//                                            it
//                                        )
//                                    }.chunked(40).map {
//                                        it.joinToString(",")
//                                    }.joinToString(",\n") + "\n\n\n",
//                                    "demo-test.txt"
//                                )
                            }

                        }


                    },
                    {

                    }
                ).let {}

            StarmaxBleClient.instance.realTimeDataStream().takeUntil(disconnectSubject)
                .subscribe({
                    bleResponse.value = JSONObject(mapOf(
                        "gsensor_list" to it.gensorsList.map {
                            hashMapOf(
                                "x" to it.x,
                                "y" to it.y,
                                "z" to it.z,
                            )
                        }.toMutableList(),
                        "steps" to it.steps,
                        "calore" to it.calore,
                        "distance" to it.distance,
                        "heart_rate" to it.heartRate,
                        "blood_pressure_ss" to it.bloodPressureSs,
                        "blood_pressure_fz" to it.bloodPressureFz,
                        "blood_oxygen"  to it.bloodOxygen,
                        "temp" to it.temp,
                        "blood_sugar" to it.bloodSugar
                    )).toString()
                },{

                }).let {  }
            StarmaxBleClient.instance.healthMeasureStream()
                .takeUntil(disconnectSubject)
                .subscribe(
                    {
                        val current = LocalDateTime.now()

                        // 创建一个 DateTimeFormatter 对象
                        val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")

                        // 格式化当前时间
                        val formatted = current.format(formatter)

                        if(it.status == 0){
                            when(it.type){
                                0x63 -> bleResponseLabel.value = "心率值:${it.dataList[0]},当前时间：${formatted}"
                                0x66 -> bleResponseLabel.value = "压力值:${it.dataList[0]},当前时间：${formatted}"
                                else -> {

                                }
                            }
                        }else{
                            bleResponseLabel.value = "測量失敗"
                        }
                    },
                    {

                    }
                ).let {}

            StarmaxBleClient.instance.nfcCardStatusStream()
                .takeUntil(disconnectSubject)
                .subscribe(
                    {
                        bleResponseLabel.value = (if(it.type == 1) "创建白卡" else "复制卡片" ) + (if(it.status == 1) "成功" else "失败")
                    },
                    {

                    }
                ).let {}

            StarmaxBleClient.instance.nfcM1Stream()
                .takeUntil(disconnectSubject)
                .subscribe(
                    {
                        var waitM1DataList = it.waitM1DataList

                        bleResponseLabel.value = "获取到NFC待破解数据"

                        StarmaxBleClient.instance.nfcM1Ack().subscribe({
                            bleResponseLabel.value = "获取到NFC待破解数据:"+byteArrayToHexString(waitM1DataList.map { it.toByte() }.toByteArray())+",已应答"
                        },{}).let {  }

                        object : Thread() {
                            override fun run() {

                                println(byteArrayToHexString(it.waitM1DataList.map { it.toByte() }.toByteArray()))

                                CrackRepository.m1(byteArrayToHexString(it.waitM1DataList.map { it.toByte() }.toByteArray()), onSuccess = {
                                        crackData, _ ->
                                    bleResponseLabel.value = "获取到NFC待破解数据,破解完成"
                                    if(crackData != null){
                                        StarmaxBleClient.instance.nfcM1Result(true,hexStringToByteArray(crackData.crackData)).subscribe({
                                            bleResponseLabel.value = "获取到NFC待破解数据,破解完成,已回复"+byteArrayToHexString(hexStringToByteArray(crackData.crackData))
                                        },{

                                        }).let {  }
                                    }
                                }, onError = {
                                        e ->
                                    e?.printStackTrace()
                                })
                            }
                        }.start()


                    },
                    {

                    }
                ).let {}
        }
    }

    fun byteArrayToHexString(data:ByteArray) : String {
        val bytes = data
        val stringBuilder = StringBuilder()

        for (i in bytes.indices) {
            stringBuilder.append(String.format("%02X", bytes[i])) // 将字节转换为十六进制字符串
        }
        return stringBuilder.toString()
    }

    fun hexStringToByteArray(hexString: String): ByteArray {
        val len = hexString.length
        val data = ByteArray(len / 2)
        for (i in 0 until len step 2) {
            val hex = hexString.substring(i, i + 2)
            data[i / 2] = hex.toInt(16).toByte()
        }
        return data
    }

    fun pair() {
        StarmaxBleClient.instance.pair().subscribe({
            bleResponseLabel.value = "佩戴状态:" + it.pairStatus
        }, {

        }).let {
            sendDisposable.add(it)
        }
    }

    fun getBtStatus(){
        Utils.p(StarmaxSend().getBtStatus())

        StarmaxBleClient.instance.getBtStatus().subscribe({
            bleResponseLabel.value = "bt状态:" + it.btStatus
        }, {

        }).let {
            sendDisposable.add(it)
        }
    }

    fun findDevice(isFind: Boolean) {
        StarmaxBleClient.instance.findDevice(isFind = isFind).subscribe({
            bleResponseLabel.value = "查找手环成功"
        }, {}).let {

        }
    }

    fun getPower() {
        StarmaxBleClient.instance.getPower().subscribe({
            bleResponseLabel.value = ("电量:${it.power}\n"
                    + "是否充电:${it.isCharge}")
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun getVersion() {
        val calendar = Calendar.getInstance()
        val lastMills = calendar.timeInMillis
        StarmaxBleClient.instance.getVersion().subscribe({
            val currentCalendar = Calendar.getInstance()
            bleModel = it.model
            bleVersion = it.version
            bleUiVersion = it.uiVersion
            uiSupportDifferentialUpgrade = it.uiSupportDifferentialUpgrade

            bleResponseLabel.value = ("固件版本:${bleVersion}\n"
                    + "ui版本:${bleUiVersion}\n"
                    + "设备接收buf大小:${it.bufferSize}\n"
                    + "lcd宽:${it.lcdWidth}\n"
                    + "lcd高:${it.lcdHeight}\n"
                    + "屏幕类型:${it.screenType}\n"
                    + "设备型号:${bleModel}\n"
                    + "ui是否强制升级:${it.uiForceUpdate}\n"
                    + "是否支持差分升级:${uiSupportDifferentialUpgrade}\n"
                    + "是否支持血糖:${it.supportSugar}\n"
                    + "设备协议版本:${it.protocolVersion}\n"
                    + "app协议版本:${StarmaxSend().version()}\n"
                    + "是否支持新睡眠:${it.sleepVersion}\n"
                    + "耗时：${currentCalendar.timeInMillis - lastMills}"
                    )
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun setTime() {
        StarmaxBleClient.instance.setTime().subscribe({
            if (it.status == 0) {
                bleResponseLabel.value = "设置时区成功"
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun setTimeOffset() {
        StarmaxBleClient.instance.setTimeOffset().subscribe({
            if (it.status == 0) {
                bleResponseLabel.value = "设置时区成功"
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun getTimeOffset() {
        StarmaxBleClient.instance.getTimeOffset().subscribe({
            if (it.status == 0) {
                bleResponseLabel.value = "获取时区成功"
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun getHealthDetail() {
        StarmaxBleClient.instance.getHealthDetail().subscribe({
            if (it.status == 0) {
                bleResponseLabel.value = ("总的计步值:${it.totalSteps}\n"
                        + "总的卡路里(卡):${it.totalHeat}\n"
                        + "总的距离(m):${it.totalDistance}\n"
                        + "睡眠总时间(分钟):${it.totalSleep}\n"
                        + "深睡时间:${it.totalDeepSleep}\n"
                        + "浅睡时间:${it.totalLightSleep}\n"
                        + "当前心率:${it.currentHeartRate}\n"
                        + "当前血压:${it.currentSs} /${it.currentFz}\n"
                        + "当前血氧:${it.currentBloodOxygen}\n"
                        + "当前压力:${it.currentPressure}\n"
                        + "当前MAI:${it.currentMai}\n"
                        + "当前梅脱:${it.currentMet}\n"
                        + "当前温度:${it.currentTemp}\n"
                        + "当前血糖:${it.currentBloodSugar}\n"
                        + "是否佩戴${it.isWear}\n"
                        )
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {

        }
    }

    fun getClock() {
        StarmaxBleClient.instance.getClock().subscribe({
            if (it.status == 0) {
                bleResponseLabel.value = it.toString()
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun setClock() {
        StarmaxBleClient.instance.setClock(
            clocks = arrayListOf(
                Clock(9, 0, true, intArrayOf(1, 1, 0, 1, 0, 1, 0), 0),
                Clock(11, 45, true, intArrayOf(1, 1, 0, 1, 0, 1, 0), 0),
                Clock(18, 0, false, intArrayOf(1, 1, 0, 1, 0, 1, 0), 0)
            )
        ).subscribe({
            if (it.status == 0) {
                bleResponseLabel.value = "设置闹钟成功"
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun getLongSit() {
        StarmaxBleClient.instance.getLongSit().subscribe({
            if (it.status == 0) {
                bleResponseLabel.value = it.toString()
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun setLongSit() {
        StarmaxBleClient.instance.setLongSit(
            true,
            9,
            0,
            23,
            0,
            1
        ).subscribe({
            if (it.status == 0) {
                bleResponseLabel.value = "设置久坐成功"
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun getDrinkWater() {
        StarmaxBleClient.instance.getDrinkWater().subscribe({
            if (it.status == 0) {
                bleResponseLabel.value = it.toString()
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun setDrinkWater() {
        StarmaxBleClient.instance.setDrinkWater(
            true,
            9,
            0,
            23,
            0,
            1
        ).subscribe({
            if (it.status == 0) {
                bleResponseLabel.value = "设置喝水成功"
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun sendMessage() {
        StarmaxBleClient.instance.sendMessage(
            MessageType.Other, "新消息","新消息内容"
        ).subscribe({
            if (it.status == 0) {
                bleResponseLabel.value = "发送消息成功"
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun setWeather() {
        StarmaxBleClient.instance.setWeather(
            arrayListOf(
                WeatherDay(-9, 40, -20, 0x05, 0x25, 0x0a, 0x07, 0x01, 0x01),
                WeatherDay(-10, 0, -16, 0x05, 0x25, 0x0a, 0x07, 0x01, 0x05),
                WeatherDay(-11, 0, -10, 0x05, 0x25, 0x0a, 0x07, 0x01, 0x06),
                WeatherDay(-12, 35, 19, 0x05, 0x25, 0x0a, 0x07, 0x01, 0x12)
            )
        ).subscribe({
            if (it.status == 0) {
                bleResponseLabel.value = "设置天气成功"
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun getWeatherSeven(){
        StarmaxBleClient.instance.getWeatherSeven().subscribe({
            if (it.status == 0) {
                bleResponseLabel.value = "读取天气成功"
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }

            val result = WeatherSevenFactory().buildGetMap(it)
            bleResponse.value = JSONObject(result.obj).toString()
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun setWeatherSeven(){
        StarmaxBleClient.instance.setWeatherSeven(
            cityName = "深圳",
            arrayListOf(
                WeatherDay(-10, 0x23, 0x13, 0x05, 0x25, 0x0a, 0x07, 0x01, 0x06,0,0,23,59,0,0,23,59),
                WeatherDay(0x1b, 0x23, 0x13, 0x05, 0x25, 0x0a, 0x07, 0x01, 0x06,0,0,23,59,0,0,23,59),
                WeatherDay(0x1b, 0x23, 0x13, 0x05, 0x25, 0x0a, 0x07, 0x01, 0x06,0,0,23,59,0,0,23,59),
                WeatherDay(0x1b, 0x23, 0x13, 0x05, 0x25, 0x0a, 0x07, 0x01, 0x06,0,0,23,59,0,0,23,59),
                WeatherDay(0x1b, 0x23, 0x13, 0x05, 0x25, 0x0a, 0x07, 0x01, 0x06,0,0,23,59,0,0,23,59),
                WeatherDay(0x1b, 0x23, 0x13, 0x05, 0x25, 0x0a, 0x07, 0x01, 0x06,0,0,23,59,0,0,23,59),
                WeatherDay(0x1b, 0x23, 0x13, 0x05, 0x25, 0x0a, 0x07, 0x01, 0x06,0,0,23,59,0,0,23,59),
                WeatherDay(0x1b, 0x23, 0x13, 0x05, 0x25, 0x0a, 0x07, 0x01, 0x06,0,0,23,59,0,0,23,59),
            )
        ).subscribe({
            if (it.status == 0) {
                bleResponseLabel.value = "设置天气成功"
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun getSummerWorldClock(){
        StarmaxBleClient.instance.getSummerWorldClock().subscribe({
            if (it.status == 0) {
                bleResponseLabel.value = "读取天气成功"
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }

            val result = SummerWorldClockFactory().buildGetMap(it)
            bleResponse.value = JSONObject(result.obj).toString()
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun setSummerWorldClock(){
        StarmaxBleClient.instance.setSummerWorldClock(
            arrayListOf(
                SummerWorldClock(2,3,2,11,1,60),
                SummerWorldClock(3,3,1 + 8,10,1 + 8,60),
                SummerWorldClock(4,3,1 + 8,10,1 + 8,60),
                SummerWorldClock(5,3,2,11,1,60),
                SummerWorldClock(9,10,1,4,1,60),
                SummerWorldClock(10,3,2,11,1,60),
                SummerWorldClock(12,3,1 + 8,10,1 + 8,60),
                SummerWorldClock(13,3,1 + 8,10,1 + 8,60),
                SummerWorldClock(17,3,2,11,1,60),
                SummerWorldClock(18,3,2,11,1,60),
                SummerWorldClock(20,3,1 + 8,10,1 + 8,60),
                SummerWorldClock(23,10,1,4,1,60),
                SummerWorldClock(25,10,1,4,1,60),
            )
        ).subscribe({
            if (it.status == 0) {
                bleResponseLabel.value = "设置世界时钟成功"
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun sendMusic() {
        StarmaxBleClient.instance.musicControl(
            1, 20, 30, "kasd asssssa", "adsadsd"
        ).subscribe({
            bleResponseLabel.value = "音乐控制成功"
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun getReminder() {
        StarmaxBleClient.instance.getEventReminder().subscribe({
            if (it.status == 0) {
                var str = ""

                val reminderList = it.eventRemindersList
                for (i in 0 until reminderList.size) {
                    val oneData = reminderList[i]
                    str += ("时间:" + oneData.year + "-" + oneData.month + "-" + oneData.day + oneData.hour + ":" + oneData.minute
                            + "内容" + oneData.content + "\n"
                            )
                }

                bleResponseLabel.value = str
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun setReminder() {
        val calendar = Calendar.getInstance()
        StarmaxBleClient.instance.setEventReminder(
            listOf(
                EventReminder(
                    calendar,
                    "和朋友出去旅游",
                    1,
                    3,
                    intArrayOf(0, 0, 0, 1, 0, 0, 0)
                ),
            )
        ).subscribe({
            if (it.status == 0) {
                bleResponseLabel.value = it.toString()
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun getSportMode() {
        StarmaxBleClient.instance.getSportMode().subscribe({
            if (it.status == 0) {
                var str = ""

                val dataList = it.sportModesList
                for (i in 0 until dataList.size) {
                    str += "运动模式:${sportModeLabel(dataList[i])}\n"
                }

                bleResponseLabel.value = str
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun setSportMode() {
        StarmaxBleClient.instance.setSportMode(
            listOf(
                0x0A,
                0x0B,
                0x0C,
                0x0D
            )
        ).subscribe({
            if (it.status == 0) {
                bleResponseLabel.value = it.toString()
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun sendHealthMeasure(isOpen: Boolean){
        StarmaxBleClient.instance.sendHealthMeasure(HistoryType.Pressure,isOpen).subscribe({
            bleResponseLabel.value = if(isOpen) "开启成功" else "关闭成功"
        },{}).let {
            sendDisposable.add(it)
        }
    }

    fun sendHeartRateHealthMeasure(isOpen: Boolean){
        StarmaxBleClient.instance.sendHealthMeasure(HistoryType.HeartRate,isOpen).subscribe({
            bleResponseLabel.value = if(isOpen) "开启成功" else "关闭成功"
        },{}).let {
            sendDisposable.add(it)
        }
    }

    fun getDebugInfo(fileType: Int){
        StarmaxBleClient.instance.getDebugInfo(packageId,fileType).subscribe({
            if (it.status == 0) {
                if(it.dataList.size > 0){
                    TestRepository.testLocal(
                        localBasePath,
                        if(fileType == 3){
                            it.dataList.map { it.toByte() }.toByteArray().toString(Charsets.US_ASCII).replace("TAG=","\nTAG=")
                        }else{
                            it.dataList.map { String.format("0x%02X", it.toByte()) }.toList().chunked(4)
                            .map {
                                it.joinToString(",")
                            }.joinToString(",\n") + ",\n\n\n"
                             },
                        when(fileType){
                            1 -> "battery.txt"
                            2 -> "gsensor.txt"
                            3 -> "sleep.txt"
                            else -> "sleep.txt"
                        }
                    )

                    packageId += 1
                    getDebugInfo(fileType)
                }
                bleResponseLabel.value = "获取"+ (if(fileType == 1) "battery.txt" else "gsensor.txt") + "第"+packageId+"包"
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun getSportHistory() {
        StarmaxBleClient.instance.getSportHistory().subscribe({
            if (it.status == 0) {
                bleResponseLabel.value = SportHistoryFactory(StarmaxBleClient.instance.bleNotify).buildMapFromProtobuf(it).toJson()
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun getStepHistory(time: Long) {
        val calendar = Calendar.getInstance()
        calendar.timeInMillis = time
        StarmaxBleClient.instance.getStepHistory(calendar).subscribe({
            if (it.status == 0) {
                var str = ("采样间隔:" + it.interval + "分钟\n"
                        + "日期:" + it.year + "-" + it.month + "-" + it.day + "\n"
                        + "数据长度:" + it.dataLength + "\n"
                        )

                val stepList = it.stepsList
                for (i in 0 until stepList.size) {
                    val oneData = stepList[i]
                    str += ("时间:" + oneData.hour + ":" + oneData.minute
                            + " 步数" + oneData.steps
                            + ",卡路里" + ((oneData.calorie).toDouble() / 1000) + "千卡"
                            + ",距离" + ((oneData.distance).toDouble() / 100) + "米\n")
                }

                val sleepList = it.sleepsList
                for (i in 0 until sleepList.size) {
                    val oneData = sleepList[i]
                    str += ("时间:" + oneData.hour + ":" + oneData.minute
                            + " 睡眠状态" + oneData.sleepStatus + "\n")
                }

                bleResponseLabel.value = str
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun getBloodPressureHistory(time: Long) {
        val calendar = Calendar.getInstance()
        calendar.timeInMillis = time
        StarmaxBleClient.instance.getBloodPressureHistory(calendar).subscribe({
            if (it.status == 0) {
                var str = ("采样间隔:" + it.interval + "分钟\n"
                        + "日期:" + it.year + "-" + it.month + "-" + it.day + "\n"
                        + "数据长度:" + it.dataLength + "\n"
                        )

                val dataList = it.dataList
                for (i in 0 until dataList.size) {
                    val oneData = dataList[i]
                    str += "时间:" + oneData.hour + ":" + oneData.minute + " 伸缩压" + oneData.ss + " 舒张压" + oneData.fz + "\n"
                }

                bleResponseLabel.value = str
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun getHeartRateHistory(time: Long) {
        val calendar = Calendar.getInstance()
        calendar.timeInMillis = time
        StarmaxBleClient.instance.getHeartRateHistory(calendar).subscribe({
            if (it.status == 0) {
                var str = ("采样间隔:" + it.interval + "分钟\n"
                        + "日期:" + it.year + "-" + it.month + "-" + it.day + "\n"
                        + "数据长度:" + it.dataLength + "\n"
                        )

                val dataList = it.dataList
                for (i in 0 until dataList.size) {
                    val oneData = dataList[i]
                    str += "时间:" + oneData.hour + ":" + oneData.minute + " 心率" + oneData.value + "%\n"
                }

                bleResponseLabel.value = str
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun getBloodOxygenHistory(time: Long) {
        val calendar = Calendar.getInstance()
        calendar.timeInMillis = time
        StarmaxBleClient.instance.getBloodOxygenHistory(calendar).subscribe({
            if (it.status == 0) {
                var str = ("采样间隔:" + it.interval + "分钟\n"
                        + "日期:" + it.year + "-" + it.month + "-" + it.day + "\n"
                        + "数据长度:" + it.dataLength + "\n"
                        )

                val dataList = it.dataList
                for (i in 0 until dataList.size) {
                    val oneData = dataList[i]
                    str += "时间:" + oneData.hour + ":" + oneData.minute + " 血氧" + oneData.value + "%\n"
                }

                bleResponseLabel.value = str
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun getPressureHistory(time: Long) {
        val calendar = Calendar.getInstance()
        calendar.timeInMillis = time
        StarmaxBleClient.instance.getPressureHistory(calendar).subscribe({
            if (it.status == 0) {
                var str = ("采样间隔:" + it.interval + "分钟\n"
                        + "日期:" + it.year + "-" + it.month + "-" + it.day + "\n"
                        + "数据长度:" + it.dataLength + "\n"
                        )

                val dataList = it.dataList
                for (i in 0 until dataList.size) {
                    val oneData = dataList[i]
                    str += "时间:" + oneData.hour + ":" + oneData.minute + " 压力" + oneData.value + "%\n"
                }

                bleResponseLabel.value = str
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun getMetHistory(time: Long) {
        val calendar = Calendar.getInstance()
        calendar.timeInMillis = time
        StarmaxBleClient.instance.getMetHistory(calendar).subscribe({
            if (it.status == 0) {
                var str = ("采样间隔:" + it.interval + "分钟\n"
                        + "日期:" + it.year + "-" + it.month + "-" + it.day + "\n"
                        + "数据长度:" + it.dataLength + "\n"
                        )

                val dataList = it.dataList
                for (i in 0 until dataList.size) {
                    val oneData = dataList[i]
                    str += "梅脱:" + oneData
                }

                bleResponseLabel.value = str
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun getOriginSleepHistory(time: Long) {
        val calendar = Calendar.getInstance()
        calendar.timeInMillis = time
        StarmaxBleClient.instance.getOriginSleepHistory(calendar).subscribe({
            if (it.status == 0) {
                var str = ("采样间隔:" + it.interval + "分钟\n"
                        + "日期:" + it.year + "-" + it.month + "-" + it.day + "\n"
                        + "数据长度:" + it.dataLength + "\n"
                        )

                val dataList = it.dataList
                for (i in 0 until dataList.size) {
                    val oneData = dataList[i]
                    if(oneData.value > 0){
                        val valueList = Utils.int2byte(oneData.value,2)
                        str += "时间:" + oneData.hour + ":" + oneData.minute + " 红外:" + valueList[1] + " sar:"+(valueList[0] * 256)+ "\n"
                    }
                }

                bleResponseLabel.value = str
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun getTempHistory(time: Long) {
        val calendar = Calendar.getInstance()
        calendar.timeInMillis = time
        StarmaxBleClient.instance.getTempHistory(calendar).subscribe({
            if (it.status == 0) {
                var str = ("采样间隔:" + it.interval + "分钟\n"
                        + "日期:" + it.year + "-" + it.month + "-" + it.day + "\n"
                        + "数据长度:" + it.dataLength + "\n"
                        )

                val dataList = it.dataList
                for (i in 0 until dataList.size) {
                    val oneData = dataList[i]
                    str += "时间:" + oneData.hour + ":" + oneData.minute + " 温度" + oneData.value + "%\n"
                }

                bleResponseLabel.value = str
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun getMaiHistory(time: Long) {
        val calendar = Calendar.getInstance()
        calendar.timeInMillis = time
        StarmaxBleClient.instance.getMaiHistory(calendar).subscribe({
            if (it.status == 0) {
                var str = ("采样间隔:" + it.interval + "分钟\n"
                        + "日期:" + it.year + "-" + it.month + "-" + it.day + "\n"
                        + "数据长度:" + it.dataLength + "\n"
                        )

                val dataList = it.dataList
                for (i in 0 until dataList.size) {
                    val oneData = dataList[i]
                    str += "MAI:" + oneData
                }

                bleResponseLabel.value = str
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun getBloodSugarHistory(time: Long) {
        val calendar = Calendar.getInstance()
        calendar.timeInMillis = time
        StarmaxBleClient.instance.getBloodSugarHistory(calendar).subscribe({
            if (it.status == 0) {
                var str = ("采样间隔:" + it.interval + "分钟\n"
                        + "日期:" + it.year + "-" + it.month + "-" + it.day + "\n"
                        + "数据长度:" + it.dataLength + "\n"
                        )

                val dataList = it.dataList
                for (i in 0 until dataList.size) {
                    val oneData = dataList[i]
                    str += "时间:" + oneData.hour + ":" + oneData.minute + " 血糖" + oneData.value + "\n"
                }

                bleResponseLabel.value = str
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun getSleepHistory(time: Long) {
        val calendar = Calendar.getInstance()
        calendar.timeInMillis = time
        StarmaxBleClient.instance.getSleepHistory(calendar).subscribe({
            if (it.status == 0) {
                var str = ("采样间隔:" + it.interval + "分钟\n"
                        + "日期:" + it.year + "-" + it.month + "-" + it.day + "\n"
                        + "数据长度:" + it.dataLength + "\n"
                        )

                val dataList = it.dataList
                for (i in 0 until dataList.size) {
                    val oneData = dataList[i]
                    if(oneData.status != 0){
                        str += "时间:" + oneData.hour + ":" + oneData.minute + " 状态" + oneData.status + "\n"
                    }

                }

                bleResponseLabel.value = str
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun getValidHistoryDates() {
        getValidHistoryDates(HistoryType.Step)
    }

    fun getSleepValidHistoryDates() {
        getValidHistoryDates(HistoryType.Sleep)
    }

    fun getMetValidHistoryDates() {
        getValidHistoryDates(HistoryType.Met)
    }

    fun getMaiValidHistoryDates() {
        getValidHistoryDates(HistoryType.Mai)
    }

    fun getBloodSugarValidHistoryDates() {
        getValidHistoryDates(HistoryType.BloodSugar)
    }

    fun getBloodOxygenValidHistoryDates() {
        getValidHistoryDates(HistoryType.BloodOxygen)
    }

    fun getValidHistoryDates(historyType: HistoryType) {
        StarmaxBleClient.instance.getValidHistoryDates(historyType).subscribe({
            if (it.status == 0) {
                var str = "有效日期\n"

                val dataList = it.dataList
                for (i in 0 until dataList.size) {
                    val oneData = dataList[i]
                    val year = oneData.year
                    val month = oneData.month
                    val day = oneData.day
                    str += "$year-$month-$day\n"
                }

                bleResponseLabel.value = str
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun sendUi() {
        object : Thread() {
            override fun run() {
                UiRepository.getVersion(
                    model = bleModel,
                    version = bleUiVersion,
                    onSuccess = { ui, _ ->
                        if (ui == null) {
                            return@getVersion
                        }

                        val file = File(savePath)
                        if (!file.exists()) file.mkdirs()
                        val url = ui.binUrl
                        val saveName = url.substring(url.lastIndexOf('/') + 1, url.length)

                        val apkFile = File(savePath + saveName)
                        if (apkFile.exists()) apkFile.delete()
                        object : Thread() {
                            override fun run() {
                                try {
                                    NetFileUtils.downloadUpdateFile(url, apkFile) {
                                        changeMtu {
                                            try {
                                                val fis = FileInputStream(apkFile)
                                                BleFileSender.initFile(fis,
                                                    object :
                                                        BleFileSenderListener() {
                                                        override fun onSuccess() {}

                                                        override fun onProgress(progress: Double) {
                                                            bleMessage.value =
                                                                "当前进度${progress}%"
                                                        }

                                                        override fun onFailure(status: Int) {
                                                            bleMessage.value = "安装失败"
                                                        }

                                                        override fun onStart() {
                                                            val data = StarmaxSend()
                                                                .sendUi(offset = 0, ui.version)
                                                            sendMsg(data)
                                                        }

                                                        override fun onCheckSum() {

                                                        }

                                                        override fun onSendComplete(){

                                                        }

                                                        override fun onSend() {
                                                            if (BleFileSender.hasNext()) {
                                                                val data = StarmaxSend().sendFile()
                                                                sendMsg(data)
                                                            }
                                                        }
                                                    })

                                                BleFileSender.sliceBuffer = 8

                                                BleFileSender.onStart()
                                            } catch (e: FileNotFoundException) {
                                                bleMessage.value = "文件未找到"
                                                e.printStackTrace()
                                            }
                                        }
                                    }
                                } catch (e: java.lang.Exception) {
                                    bleMessage.value = "服务器错误"
                                    e.printStackTrace()
                                }
                            }
                        }.start()
                    },
                    onError = { e ->
                        bleMessage.value = "服务器错误"
                        e?.printStackTrace()
                    })
            }
        }.start()
    }

    fun sendUiDiff() {
        if (!uiSupportDifferentialUpgrade) {
            bleMessage.value = "当前设备不支持UI差分升级"
            return
        }
        object : Thread() {
            override fun run() {
                UiRepository.getDiff(
                    model = bleModel,
                    version = bleUiVersion,
                    onSuccess = { ui, _ ->
                        if (ui == null) {
                            return@getDiff
                        }

                        val file = File(savePath)
                        if (!file.exists()) file.mkdirs()
                        val url = ui.binUrl
                        val saveName = url.substring(url.lastIndexOf('/') + 1, url.length)

                        val apkFile = File(savePath + saveName)
                        if (apkFile.exists()) apkFile.delete()
                        object : Thread() {
                            override fun run() {
                                try {
                                    NetFileUtils.downloadUpdateFile(url, apkFile) {
                                        changeMtu {
                                            try {
                                                val fis = FileInputStream(apkFile)

                                                BleFileSender.initFile(fis,
                                                    object :
                                                        BleFileSenderListener() {
                                                        override fun onSuccess() {}

                                                        override fun onProgress(progress: Double) {
                                                            bleMessage.value =
                                                                "当前进度${progress}%"
                                                        }

                                                        override fun onFailure(status: Int) {}

                                                        override fun onStart() {
                                                            val data = StarmaxSend()
                                                                .sendUi(
                                                                    offset = ui.offset,
                                                                    ui.version
                                                                )
                                                            sendMsg(data)
                                                        }

                                                        override fun onCheckSum() {

                                                        }

                                                        override fun onSendComplete(){

                                                        }

                                                        override fun onSend() {
                                                            if (BleFileSender.hasNext()) {
                                                                val data = StarmaxSend().sendFile()
                                                                sendMsg(data)
                                                            }
                                                        }
                                                    })

                                                BleFileSender.sliceBuffer = 8

                                                BleFileSender.onStart()
                                            } catch (e: FileNotFoundException) {
                                                bleMessage.value = "文件未找到"
                                                e.printStackTrace()
                                            }
                                        }
                                    }
                                } catch (e: java.lang.Exception) {
                                    bleMessage.value = "服务器错误"
                                    e.printStackTrace()
                                }
                            }
                        }.start()
                    },
                    onError = { e ->
                        bleMessage.value = "服务器错误"
                        e?.printStackTrace()
                    })
            }
        }.start()
    }

    fun sendUiLocal(context: Context, uri: Uri) {
        try {
            val fis = context.contentResolver.openInputStream(uri)

            BleFileSender.initFile(fis,
                object :
                    BleFileSenderListener() {
                    override fun onSuccess() {}

                    override fun onProgress(progress: Double) {
                        bleMessage.value = "当前进度${progress}%"
                    }

                    override fun onCheckSum() {

                    }

                    override fun onSendComplete(){

                    }

                    override fun onFailure(status: Int) {}

                    override fun onStart() {
                        val data = StarmaxSend().sendUi(offset = 0, "1.0.0")
                        sendMsg(data)
                    }

                    override fun onSend() {
                        if (BleFileSender.hasNext()) {
                            println()
                            val data = StarmaxSend().sendFile()
                            sendMsg(data)
                        }
                    }
                })

            BleFileSender.sliceBuffer = 8

            BleFileSender.onStart()
        } catch (e: FileNotFoundException) {
            bleMessage.value = "未找到文件"
            e.printStackTrace()
        }
    }

    fun sendDialLocal(context: Context) {
        changeMtu {
            try {
                val bin = context.contentResolver.openInputStream(binUri!!) as FileInputStream?
                var lastSendCalendar = Calendar.getInstance()
                BleFileSender.initFile(
                    bin,
                    object : BleFileSenderListener() {
                        override fun onSuccess() {}

                        override fun onProgress(progress: Double) {
                            bleMessage.value = "当前进度${progress.toInt()}%"
                        }

                        override fun onFailure(status: Int) {}

                        override fun onCheckSum() {

                        }

                        override fun onSendComplete(){

                        }

                        override fun onStart() {
                            val data = StarmaxSend()
                                .sendDial(
                                    5001,
                                    BmpUtils.bmp24to16(255, 255, 255),
                                    1
                                )
                            //p(data)
                            sendMsg(data)
                        }

                        override fun onSend() {
                            if (BleFileSender.hasNext()) {
                                val data = StarmaxSend().sendFile()

                                sendMsg(data)
                            }
                        }
                    })

                BleFileSender.sliceBuffer = 8

                BleFileSender.onStart()
            } catch (e: FileNotFoundException) {
                bleMessage.value = "服务器错误"
                e.printStackTrace()
            }
        }
    }

    fun sendLogoLocal(context: Context) {
        changeMtu {
            try {
                val bin = context.contentResolver.openInputStream(binUri!!) as FileInputStream?
                BleFileSender.initFile(
                    bin,
                    object : BleFileSenderListener() {
                        override fun onSuccess() {}

                        override fun onProgress(progress: Double) {
                            bleMessage.value = "当前进度${progress.toInt()}%"
                        }

                        override fun onFailure(status: Int) {}

                        override fun onCheckSum() {

                        }

                        override fun onSendComplete(){

                        }

                        override fun onStart() {
                            val data = StarmaxSend()
                                .sendLogo()
                            sendMsg(data)
                        }

                        override fun onSend() {
                            if (BleFileSender.hasNext()) {
                                val data = StarmaxSend().sendFile()

                                sendMsg(data)
                            }
                        }
                    })

                BleFileSender.sliceBuffer = 8

                BleFileSender.onStart()
            } catch (e: FileNotFoundException) {
                bleMessage.value = "服务器错误"
                e.printStackTrace()
            }
        }
    }

    fun clearLogo(){
        StarmaxBleClient.instance.clearLogo().subscribe({
            if (it.status == 0) {
                bleResponseLabel.value = "清除logo成功"
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun sendGts7FirmwareLocal(context: Context) {
        if(binUri == null){
            return
        }

        changeMtu {
            try {
                val bin = context.contentResolver.openInputStream(binUri!!) as FileInputStream?
                val lastSendCalendar = Calendar.getInstance()
                BleFileSender.initFile(
                    bin,
                    object : BleFileSenderListener() {
                        override fun onSuccess() {
                            val currentCalendar = Calendar.getInstance()
                            // 计算时间差异（以秒为单位）
                            // 计算时间差异（以秒为单位）
                            val diffInSeconds: Long =
                                (currentCalendar.getTimeInMillis() - lastSendCalendar.getTimeInMillis()) / 1000
                            bleMessage.value = "发送完成,耗时${diffInSeconds}"
                        }

                        override fun onProgress(progress: Double) {
                            val currentCalendar = Calendar.getInstance()
                            // 计算时间差异（以秒为单位）
                            // 计算时间差异（以秒为单位）
                            val diffInSeconds: Long =
                                (currentCalendar.getTimeInMillis() - lastSendCalendar.getTimeInMillis()) / 1000

                            bleMessage.value = "当前进度${progress.toInt()}%,耗时${diffInSeconds}"

                        }

                        override fun onFailure(status: Int) {
                            bleMessage.value = "发送失败"
                        }

                        override fun onCheckSum() {
                            val data = StarmaxSend().sendDiffCheckSum()
                            Log.d("Diff Sender","${BleFileSender.checksumData.size}")
                            bleMessage.value = "正在发送第${BleFileSender.checksumSendIndex}包校验码"
                            sendMsg(data)
                        }

                        override fun onStart() {
                            val data = StarmaxSend().sendDiffHeader()
                            bleMessage.value = "发送文件头"
                            sendMsg(data)
                        }

                        override fun onSendComplete(){
                            val data = StarmaxSend().sendDiffComplete()
                            bleMessage.value = "发送结束通知固件"
                            sendMsg(data)
                        }

                        override fun onSend() {
                            val data = StarmaxSend().sendDiffFile()
                            //bleMessage.value = "正在发送，当前偏移"+BleFileSender.checksumIndex+"/"+BleFileSender.checksumInfo.size
                            sendMsg(data)
                        }
                    })

                BleFileSender.sliceBuffer = 8

                BleFileSender.onStart()
            } catch (e: FileNotFoundException) {
                bleMessage.value = "服务器错误"
                e.printStackTrace()
            }
        }
    }

    fun sendGts7CrcLocal(context: Context) {
        if(binUri == null){
            return
        }

        try {
            val bin = context.contentResolver.openInputStream(binUri!!) as FileInputStream?
            val lastSendCalendar = Calendar.getInstance()
            BleFileSender.initFile(
                bin,
                object : BleFileSenderListener() {
                    override fun onSuccess() {
                        val currentCalendar = Calendar.getInstance()
                        // 计算时间差异（以秒为单位）
                        // 计算时间差异（以秒为单位）
                        val diffInSeconds: Long =
                            (currentCalendar.getTimeInMillis() - lastSendCalendar.getTimeInMillis()) / 1000
                        bleMessage.value = "发送完成,耗时${diffInSeconds}"
                    }

                    override fun onProgress(progress: Double) {
                        val currentCalendar = Calendar.getInstance()
                        // 计算时间差异（以秒为单位）
                        // 计算时间差异（以秒为单位）
                        val diffInSeconds: Long =
                            (currentCalendar.getTimeInMillis() - lastSendCalendar.getTimeInMillis()) / 1000

                        bleMessage.value = "当前进度${progress.toInt()}%,耗时${diffInSeconds}"

                    }

                    override fun onFailure(status: Int) {
                        bleMessage.value = "发送失败"
                    }

                    override fun onCheckSum() {
                        val data = StarmaxSend().sendDiffCheckSum()
                        Log.d("Diff Sender","正在发送第${BleFileSender.checksumSendIndex}包")
                        Log.d("Diff Sender","checksum 大小:${BleFileSender.checksumData.size}")
                        bleMessage.value = "正在发送第${BleFileSender.checksumSendIndex}包校验码"
                        Log.d("Diff Sender","data 大小:${data.size}")
                        Utils.p(data)
                        StarmaxBleClient.instance.notify(StarmaxSendRequest(0xF3, intArrayOf(0x00,0x01)).datas)
                    }

                    override fun onStart() {
                        val data = StarmaxSend().sendDiffHeader()
                        bleMessage.value = "发送文件头"
                        Utils.p(data)

                        StarmaxBleClient.instance.notify(StarmaxSendRequest(0xF3, intArrayOf(0x00,0x00)).datas)
                    }

                    override fun onSendComplete(){
                        val data = StarmaxSend().sendDiffComplete()
                        bleMessage.value = "发送结束通知固件"

                        Utils.p(data)
                    }

                    override fun onSend() {
                        val data = StarmaxSend().sendDiffFile()
                        Utils.p(data)
                    }
                })

            BleFileSender.sliceBuffer = 8

            BleFileSender.onStart()
        } catch (e: FileNotFoundException) {
            bleMessage.value = "服务器错误"
            e.printStackTrace()
        }
    }

    fun sendCustomDial(context: Context) {

        changeMtu {
            try {
                val bin = context.contentResolver.openInputStream(binUri!!) as FileInputStream?
                val img =
                    context.contentResolver.openInputStream(imageUri!!) as FileInputStream?

                var lastSendCalendar = Calendar.getInstance()
                BleFileSender.initFileWithBackground(
                    bin,
                    240, 282,
                    img,
                    object : BleFileSenderListener() {
                        override fun onSuccess() {}

                        override fun onProgress(progress: Double) {
                            bleMessage.value = "当前进度${progress.toInt()}%"
                        }

                        override fun onFailure(status: Int) {}
                        override fun onStart() {
                            val data = StarmaxSend()
                                .sendDial(
                                    5001,
                                    BmpUtils.bmp24to16(255, 255, 255),
                                    1
                                )
                            Utils.p(data)
                            sendMsg(data)
                        }

                        override fun onCheckSum() {

                        }

                        override fun onSendComplete(){

                        }

                        override fun onSend() {
                            if (BleFileSender.hasNext()) {
                                val data = StarmaxSend().sendFile()
                                //p(data)
                                BleManager.getInstance().write(
                                    bleDevice?.get(),
                                    WriteServiceUUID.toString(),
                                    WriteCharacteristicUUID.toString(),
                                    data,
                                    object : BleWriteCallback() {
                                        override fun onWriteSuccess(
                                            current: Int,
                                            total: Int,
                                            justWrite: ByteArray?
                                        ) {
                                            if (current == total) {
                                                val newSendCalendar = Calendar.getInstance()
                                                val millis =
                                                    newSendCalendar.timeInMillis - lastSendCalendar.timeInMillis
                                                Log.e(
                                                    "BleFileSender",
                                                    "发送时间:${millis},当前rssi:"
                                                )
                                                lastSendCalendar = Calendar.getInstance()
                                            }
                                        }

                                        override fun onWriteFailure(exception: BleException?) {
                                            //bleMessage.value = "指令发送失败"
                                        }
                                    })

                            }
                        }
                    })

                BleFileSender.sliceBuffer = 8

                BleFileSender.onStart()
            } catch (e: FileNotFoundException) {
                bleMessage.value = "服务器错误"
                e.printStackTrace()
            }
        }
    }

    fun getDialInfo() {
        StarmaxBleClient.instance.getDialInfo().subscribe({
            var str = ""

            val dataList = it.infosList
            for (i in 0 until dataList.size) {
                val oneData = dataList[i]
                val isSelected = oneData.isSelected
                val dialId = oneData.dialId
                val dialColor = oneData.dialColor
                val align = oneData.align
                if (isSelected == 1) {
                    str += "已选择\n"
                }
                str += "表盘id:${dialId}\n"
                str += "表盘颜色:${
                    Utils.bytesToHex(
                        Utils.int2byte(
                            dialColor,
                            3
                        )
                    )
                }\n"
                str += "位置:${align}\n"
            }

            bleResponseLabel.value = str
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun switchDial() {
        StarmaxBleClient.instance.switchDial(5001).subscribe({
            if (it.status == 0) {
                bleResponseLabel.value = "切换表盘成功"
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun reset() {
        StarmaxBleClient.instance.reset().subscribe({
            bleResponseLabel.value = "恢复出厂成功"
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun close() {
        StarmaxBleClient.instance.close().subscribe({
            bleResponseLabel.value = "关机成功"
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun shippingMode() {
        StarmaxBleClient.instance.shippingMode().subscribe({
            bleResponseLabel.value = "进入船运模式"
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    fun getNfcCardInfo() {
        StarmaxBleClient.instance.getNfcInfo().subscribe({
            if (it.status == 0) {
                var str = ("类型:" + it.type)

                val cardsList = it.cardsList
                for (i in 0 until cardsList.size) {
                    val oneData = cardsList[i]
                    str += "卡片类型:" + oneData.cardType + ",卡片名称" + oneData.cardName + "%\n"
                }

                bleResponseLabel.value = str
            } else {
                bleResponseLabel.value = statusLabel(it.status)
            }
        }, {}).let {
            sendDisposable.add(it)
        }
    }

    /**
     * @param data
     */
    fun sendMsg(data: ByteArray?) {
        if (bleDevice == null || bleDevice!!.get() == null || !BleManager.getInstance()
                .isConnected(bleDevice!!.get())
        ) {
            sendDisposable.clear() //清空发送栈
            viewModelScope.launch {
                Toast.makeText(context, "蓝牙未连接", Toast.LENGTH_SHORT).show()
            }
            return
        }

        BleManager.getInstance().write(
            bleDevice?.get(),
            WriteServiceUUID.toString(),
            WriteCharacteristicUUID.toString(),
            data,
            object : BleWriteCallback() {
                override fun onWriteSuccess(current: Int, total: Int, justWrite: ByteArray?) {
                    //bleMessage.value = "指令发送成功"
                    //println("当前 $current 总共 $total 已写 $justWrite")
                }

                override fun onWriteFailure(exception: BleException?) {
                    //bleMessage.value = "指令发送失败"
                }
            })
    }

    fun copy() {
        val clipboardManager =
            context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager

        val text = originData.value.map { String.format("0x%02X", it) }.chunked(40).map {
            it.joinToString(",")
        }.joinToString(",\n") + "\n" + bleResponse.toString() + "\n"

        clipboardManager.setPrimaryClip(ClipData.newPlainText("text", text))
    }

    fun changeMtu(onMtuChanged: () -> Unit) {
        BleManager.getInstance().setMtu(bleDevice?.get(), 512, object : BleMtuChangedCallback() {
            override fun onSetMTUFailure(exception: BleException) {
                // 设置MTU失败
            }

            override fun onMtuChanged(mtu: Int) {
                BleManager.getInstance().setSplitWriteNum(min(mtu - 3,512))
                Log.e("BleViewModel", "设置mtu成功")
                onMtuChanged()
            }
        })
    }

    private fun statusLabel(status: Int): String {
        return when (status) {
            0 -> "命令正确"
            1 -> "命令码错误"
            2 -> "校验码错误"
            3 -> "数据长度错误"
            4 -> "数据无效"
            else -> "数据无效"
        };
    }

    private fun sportModeLabel(mode: Int): String {
        return when (mode) {
            0X00 -> "室内跑步"
            0X01 -> "户外跑步"
            0X03 -> "户外骑行"
            0X04 -> "健走"
            0X05 -> "跳绳"
            0X06 -> "足球"
            0X07 -> "羽毛球"
            0X09 -> "篮球"
            0X0A -> "椭圆机"
            0X0B -> "徒步"
            0X0C -> "瑜伽"
            0X0D -> "力量训练"
            0X0E -> "爬山"
            0X0F -> "自由运动"
            0X10 -> "户外步行"
            0X12 -> "室内单车"
            else -> "数据无效"
        };
    }

    class BluetoothListenerReceiver(val bleViewModel: BleViewModel) : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                BluetoothAdapter.ACTION_STATE_CHANGED -> {
                    when (intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, 0)) {
                        BluetoothAdapter.STATE_TURNING_ON -> Log.e(
                            "BleReceiver",
                            "onReceive---------蓝牙正在打开中"
                        )

                        BluetoothAdapter.STATE_ON -> {
                            Log.e("BleReceiver", "onReceive---------蓝牙已经打开")
                            Handler(Looper.getMainLooper()).postDelayed({
                                BleManager.getInstance().connect(bleViewModel.bleDevice?.get()?.mac,bleViewModel.bleGattCallback)
                            },1000)

                        }

                        BluetoothAdapter.STATE_TURNING_OFF -> {
                            Log.e(
                                "BleReceiver",
                                "onReceive---------蓝牙正在关闭中"
                            )
                        }

                        BluetoothAdapter.STATE_OFF -> {
                            Log.e("BleReceiver", "onReceive---------蓝牙已经关闭")
                            bleViewModel.bleState = BleState.DISCONNECTED
                            BleManager.getInstance().destroy()
                        }
                    }
                }
            }
        }
    }

    private fun makeFilter(): IntentFilter {
        val filter = IntentFilter()
        filter.addAction(BluetoothAdapter.ACTION_STATE_CHANGED)
        return filter
    }

    fun bindDevice() : MutableMap<String,Any>{
        val bluetoothDevice = bleDevice!!.get()!!.device

        Log.e("BleViewModel", "绑定设备类型"+bluetoothDevice.type.toString() )
        val label = when(bluetoothDevice.type){
            1 -> "经典蓝牙"
            2 -> "LE蓝牙"
            3 -> "双模蓝牙"
            else -> "未知蓝牙"
        }
        Toast.makeText(context, label, Toast.LENGTH_SHORT).show()
        var result = false
        if((bluetoothDevice.type == BluetoothDevice.DEVICE_TYPE_DUAL || bluetoothDevice.type == BluetoothDevice.DEVICE_TYPE_CLASSIC) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M){
            result = createBind(bluetoothDevice, BluetoothDevice.TRANSPORT_BREDR)
            Log.e("BleViewModel", "双模蓝牙绑定" + if(result) "成功" else "失败" )
        }else if(bluetoothDevice.type == BluetoothDevice.DEVICE_TYPE_LE){
            result = createBind(bluetoothDevice)
            Log.e("BleViewModel", "经典蓝牙绑定" + if(result) "成功" else "失败" )
        }

        val data: MutableMap<String, Any> = java.util.HashMap()
        data["is_success"] = result
        data["type"] = bluetoothDevice.type

        return data
    }
    fun createBind(device: BluetoothDevice?) : Boolean{
        var bRet = false
        if (Build.VERSION.SDK_INT >= 20) {
            bRet = device!!.createBond()
        } else {
            val btClass: Class<*> = device!!.javaClass
            try {
                val createBondMethod = btClass.getMethod("createBond")
                val `object` = createBondMethod.invoke(device) as? Boolean ?: return false
                bRet = `object`
            } catch (var6: java.lang.Exception) {
                var6.printStackTrace()
            }
        }

        return bRet
    }

    fun createBind(device: BluetoothDevice?,transport: Int) : Boolean{
        if(device == null) return false
        var bRet = false
        try{
            Log.e("BleViewModel", "进入双模蓝牙绑定" )
            val bluetoothDeviceClass = device.javaClass
            val createBondMethod = bluetoothDeviceClass.getDeclaredMethod("createBond",transport.javaClass)
            createBondMethod.isAccessible = true
            val obj = createBondMethod.invoke(device,transport)
            if(obj !is Boolean) return false
            bRet = obj
        }catch (e: Exception){
            e.printStackTrace()
        }
        return bRet
    }

    fun bindService(){
        context.bindService(
            Intent(
                context,
                RxBleService::class.java
            ), serviceConnection, Context.BIND_AUTO_CREATE
        )
    }

    fun unbindService(){
        context.unbindService(serviceConnection)
    }
}